// @ts-nocheck
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requestCAE, generateAFIPQR, getAFIPCredentials, getCompanyCuit } from '@/lib/afip';
import type { InvoiceRequest } from '@/lib/afip';
import prisma from '@/lib/db';
import { IVA_TIPOS } from '@/lib/afip/wsfev1';
import { isNotaCreditoDebitoCode, normalizeDocumentCode } from '@/lib/document-codes';
import { parseAfipCalendarDate } from '@/lib/afip/date-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { cuit: afipCuit, environment } = getAFIPCredentials();
    
    // Modelo delegación: usar CUIT de la empresa del usuario
    const companyId = (session.user as any).companyId;
    const companyCuit = await getCompanyCuit(companyId);
    // El CUIT para el QR y comprobante es el de la empresa (si existe), no el de EMITIA
    const cuitEmisor = companyCuit || afipCuit;

    // Build invoice request
    let cbtesAsociados = body.cbtesAsociados;

    // Respaldo: si es NC/ND y falta CbtesAsoc, obtenerlo de la factura vinculada en BD
    if ((!cbtesAsociados || cbtesAsociados.length === 0) && body.invoiceId && isNotaCreditoDebitoCode(body.tipoComprobante)) {
      try {
        const draftInvoice = await prisma.invoice.findUnique({
          where: { id: body.invoiceId },
          select: { linkedInvoiceId: true },
        });
        if (draftInvoice?.linkedInvoiceId) {
          const parentInvoice = await prisma.invoice.findUnique({
            where: { id: draftInvoice.linkedInvoiceId },
          });
          if (parentInvoice?.sequenceNumber) {
            cbtesAsociados = [{
              tipo: parseInt(normalizeDocumentCode(parentInvoice.documentCode) || '0', 10),
              puntoVenta: parentInvoice.pointOfSale || body.puntoVenta || 1,
              numero: parentInvoice.sequenceNumber,
              fecha: parentInvoice.createdAt
                ? new Date(parentInvoice.createdAt).toISOString().split('T')[0].replace(/-/g, '')
                : undefined,
            }];
          }
        }
      } catch (linkErr) {
        console.warn('[AFIP] No se pudo resolver factura asociada:', (linkErr as Error)?.message);
      }
    }

    const invoiceReq: InvoiceRequest = {
      puntoVenta: body.puntoVenta || 1,
      tipoComprobante: body.tipoComprobante,
      concepto: body.concepto || 1,
      tipoDocumento: body.tipoDocumento || 99,
      nroDocumento: body.nroDocumento || '0',
      items: body.items || [],
      condicionIVAReceptorId: body.condicionIVAReceptorId,
      fechaServicioDesde: body.fechaServicioDesde,
      fechaServicioHasta: body.fechaServicioHasta,
      fechaVencimientoPago: body.fechaVencimientoPago,
      moneda: body.moneda || 'PES',
      cotizacion: body.cotizacion || 1,
      cbtesAsociados,
      numeroComprobante: body.numeroComprobante,
    };

    // Validate
    if (!invoiceReq.tipoComprobante) {
      return NextResponse.json({ error: 'Tipo de comprobante requerido' }, { status: 400 });
    }
    if (!invoiceReq.items || invoiceReq.items.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un item' }, { status: 400 });
    }

    // Request CAE from AFIP (modelo delegación: pasa companyCuit)
    const result = await requestCAE(invoiceReq, companyCuit);

    if (result.success && result.cae) {
      // Generate QR
      const today = new Date();
      const fechaStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const totalAmount = invoiceReq.items.reduce((sum, item) => {
        const subtotal = item.cantidad * item.precioUnitario - (item.bonificacion || 0);
        const ivaRate = IVA_TIPOS[item.ivaId]?.alicuota ?? 21;
        return sum + subtotal + (subtotal * ivaRate / 100);
      }, 0);

      const qrUrl = generateAFIPQR({
        ver: 1,
        fecha: fechaStr,
        cuit: cuitEmisor,
        ptoVta: invoiceReq.puntoVenta,
        tipoCmp: invoiceReq.tipoComprobante,
        nroCmp: result.comprobanteNumero!,
        importe: Math.round(totalAmount * 100) / 100,
        moneda: invoiceReq.moneda || 'PES',
        ctz: invoiceReq.cotizacion || 1,
        tipoDocRec: invoiceReq.tipoDocumento,
        nroDocRec: invoiceReq.nroDocumento,
        tipoCodAut: 'E',
        codAut: result.cae,
      });

      // Update invoice in DB if invoiceId provided
      if (body.invoiceId) {
        try {
          const realInvoiceNumber = `${String(invoiceReq.puntoVenta).padStart(4, '0')}-${String(result.comprobanteNumero).padStart(8, '0')}`;
          await prisma.invoice.update({
            where: { id: body.invoiceId },
            data: {
              cae: result.cae,
              caeExpiration: result.caeVencimiento
                ? parseAfipCalendarDate(result.caeVencimiento)
                : null,
              status: 'emitida',
              invoiceNumber: realInvoiceNumber,
              sequenceNumber: result.comprobanteNumero,
            },
          });

          // Also sync company's internal counter
          if (companyId) {
            await prisma.company.update({
              where: { id: companyId },
              data: { nextInvoiceNum: (result.comprobanteNumero || 0) + 1 },
            }).catch(e => console.warn('[AFIP] Could not sync nextInvoiceNum:', e.message));
          }
        } catch (dbError) {
          console.error('[AFIP] Error updating invoice in DB:', dbError);
        }
      }

      return NextResponse.json({
        success: true,
        cae: result.cae,
        caeVencimiento: result.caeVencimiento,
        comprobanteNumero: result.comprobanteNumero,
        comprobanteFecha: result.comprobanteFecha,
        qrUrl,
        environment,
        observaciones: result.observaciones,
      });
    } else {
      return NextResponse.json({
        success: false,
        errores: result.errores,
        observaciones: result.observaciones,
        resultado: result.resultado,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[AFIP Invoice Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al solicitar CAE',
    }, { status: 500 });
  }
}
