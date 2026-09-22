import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getPersona, getPersonaFallback, determineTaxCondition, buildPersonaName, PROVINCIAS_MAP, getCompanyCuit } from '@/lib/afip';
import {
  customerNeedsAfipEnrichment,
  mergeCustomerWithPersona,
  fetchPersonaFromAfip,
} from '@/lib/afip/customer-enrichment';

export const dynamic = 'force-dynamic';

// Determine document type from CUIT prefix
function getDocumentType(cuit: string): string {
  if (cuit.length !== 11) return 'DNI';
  const prefix = cuit.substring(0, 2);
  if (['20', '23', '24', '27'].includes(prefix)) return 'CUIL';
  return 'CUIT';
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    if (!companyId && userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 });
    }

    // Modelo delegación: obtener CUIT de la empresa para consultas AFIP
    const companyCuit = await getCompanyCuit(companyId);

    const { searchParams } = new URL(req.url);
    const document = searchParams.get('document');
    const autoCreate = searchParams.get('autoCreate') === 'true';

    if (!document) {
      return NextResponse.json({ error: 'Documento requerido' }, { status: 400 });
    }

    const cleanDoc = document.replace(/[-\s.]/g, '');

    // Validate format
    if (cleanDoc.length < 7 || cleanDoc.length > 11 || !/^\d+$/.test(cleanDoc)) {
      return NextResponse.json({
        error: 'Formato de documento inválido. Use CUIT (11 dígitos), CUIL (11 dígitos) o DNI (7-8 dígitos)'
      }, { status: 400 });
    }

    const documentType = getDocumentType(cleanDoc);
    const companyFilter = userRole === 'superadmin' ? {} : { companyId };

    // Step 1: Search local database
    const localCustomer = await prisma.customer.findFirst({
      where: {
        ...companyFilter,
        OR: [
          { document: cleanDoc },
          { document: document },
        ]
      }
    });

    if (localCustomer) {
      const baseCustomer = {
        id: localCustomer.id,
        name: localCustomer.name,
        document: localCustomer.document || cleanDoc,
        documentType: localCustomer.documentType || documentType,
        email: localCustomer.email,
        phone: localCustomer.phone,
        address: localCustomer.address,
        city: localCustomer.city,
        province: localCustomer.province,
        taxCondition: localCustomer.taxCondition || 'consumidor_final',
      };

      // Enriquecer desde AFIP si faltan domicilio o condición IVA real
      if (cleanDoc.length === 11 && customerNeedsAfipEnrichment(baseCustomer)) {
        const afipPersona = await fetchPersonaFromAfip(cleanDoc, companyCuit);
        if (afipPersona) {
          const merged = mergeCustomerWithPersona(baseCustomer, afipPersona, documentType);

          if (companyId) {
            try {
              await prisma.customer.update({
                where: { id: localCustomer.id },
                data: {
                  name: merged.name || localCustomer.name,
                  address: merged.address || null,
                  city: merged.city || null,
                  province: merged.province || null,
                  taxCondition: merged.taxCondition,
                  documentType: merged.documentType || documentType,
                },
              });
            } catch (updateErr) {
              console.error('[Lookup] Error updating customer from AFIP:', updateErr);
            }
          }

          return NextResponse.json({
            found: true,
            source: 'local+afip',
            enriched: true,
            customer: {
              ...merged,
              email: merged.email ?? localCustomer.email,
              phone: merged.phone ?? localCustomer.phone,
            },
          });
        }
      }

      return NextResponse.json({
        found: true,
        source: 'local',
        customer: {
          id: baseCustomer.id,
          name: baseCustomer.name,
          document: baseCustomer.document,
          documentType: baseCustomer.documentType,
          email: baseCustomer.email,
          phone: baseCustomer.phone,
          address: baseCustomer.address,
          city: baseCustomer.city,
          province: baseCustomer.province,
          taxCondition: baseCustomer.taxCondition,
        },
      });
    }

    // Step 2: For CUIT/CUIL (11 digits), query AFIP padrón
    let afipPersona = null;
    let afipError = null;
    if (cleanDoc.length === 11) {
      // Try AFIP SOAP WS first (requires ws_sr_padron_a5 authorization)
      try {
        afipPersona = await getPersona(cleanDoc, companyCuit);
        console.log('[Lookup] AFIP SOAP result:', afipPersona ? 'found' : 'not found');
      } catch (err: any) {
        const errMsg = err.message || '';
        console.log('[Lookup] AFIP SOAP error:', errMsg.substring(0, 150));
      }
      
      // If SOAP didn't find the person, try cuitonline.com fallback
      if (!afipPersona) {
        console.log('[Lookup] Trying cuitonline.com fallback...');
        try {
          afipPersona = await getPersonaFallback(cleanDoc);
          console.log('[Lookup] Fallback result:', afipPersona ? 'found' : 'not found');
        } catch (fallbackErr: any) {
          console.log('[Lookup] Fallback error:', (fallbackErr.message || '').substring(0, 100));
          afipError = 'No se pudo consultar AFIP. ' + (fallbackErr.message || '');
        }
      }
    }

    if (afipPersona) {
      const name = buildPersonaName(afipPersona);
      const taxCondition = determineTaxCondition(
        afipPersona.impuestos,
        afipPersona.tipoPersona,
        cleanDoc,
      );
      const address = afipPersona.domicilioFiscal?.direccion || '';
      const city = afipPersona.domicilioFiscal?.localidad || '';
      const province = afipPersona.domicilioFiscal?.descripcionProvincia || 
        (afipPersona.domicilioFiscal?.idProvincia !== undefined 
          ? PROVINCIAS_MAP[afipPersona.domicilioFiscal.idProvincia] || '' 
          : '');

      // Step 3: Auto-create customer if requested
      let createdCustomer = null;
      if (autoCreate && companyId) {
        try {
          createdCustomer = await prisma.customer.create({
            data: {
              companyId,
              name: name || `CUIT ${cleanDoc}`,
              document: cleanDoc,
              documentType,
              address: address || null,
              city: city || null,
              province: province || null,
              taxCondition,
              notes: `Importado automáticamente desde AFIP. ${afipPersona.tipoPersona}. Estado: ${afipPersona.estadoClave || 'N/A'}`,
            }
          });
        } catch (createError: any) {
          if (createError.code === 'P2002') {
            const existing = await prisma.customer.findFirst({
              where: { companyId, document: cleanDoc }
            });
            if (existing) createdCustomer = existing;
          } else {
            console.error('[Lookup] Error creating customer:', createError);
          }
        }
      }

      return NextResponse.json({
        found: true,
        source: 'afip',
        customer: {
          id: createdCustomer?.id || null,
          name: name || `CUIT ${cleanDoc}`,
          document: cleanDoc,
          documentType,
          email: null,
          phone: null,
          address,
          city,
          province,
          taxCondition,
          estadoClave: afipPersona.estadoClave,
          tipoPersona: afipPersona.tipoPersona,
          actividades: afipPersona.actividades?.slice(0, 3),
        },
        autoCreated: !!createdCustomer,
      });
    }

    // Step 4: Not found anywhere
    const suggestedTaxCondition = documentType === 'DNI'
      ? 'consumidor_final'
      : ['30', '33', '34'].includes(cleanDoc.substring(0, 2))
        ? 'responsable_inscripto'
        : 'consumidor_final';

    return NextResponse.json({
      found: false,
      source: 'none',
      suggestion: {
        document: cleanDoc,
        documentType,
        taxCondition: suggestedTaxCondition,
      },
      message: afipError 
        ? `Error al consultar AFIP: ${afipError}. Ingrese los datos manualmente.`
        : cleanDoc.length === 11
          ? 'CUIT no encontrado en AFIP ni en la base local. Verifique el número o ingrese los datos manualmente.'
          : 'DNI no encontrado en la base local. Ingrese los datos del cliente manualmente.',
    });

  } catch (error: any) {
    console.error('[Lookup Document] Error:', error);
    return NextResponse.json({ error: 'Error al buscar documento: ' + (error.message || 'Error interno') }, { status: 500 });
  }
}
