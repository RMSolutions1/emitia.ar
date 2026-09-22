// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getLastAuthorizedVoucher, consultVoucher, getCompanyCuit } from '@/lib/afip';
import { parseAfipCalendarDate } from '@/lib/afip/date-utils';

export const dynamic = 'force-dynamic';

// Map AFIP document tipo to letter
function getLetterFromCode(code: number): string {
  const aTypes = [1, 2, 3, 4, 5, 51, 52, 53];
  const bTypes = [6, 7, 8, 9, 10];
  const cTypes = [11, 12, 13, 15, 16];
  const eTypes = [19, 20, 21];
  if (aTypes.includes(code)) return 'A';
  if (bTypes.includes(code)) return 'B';
  if (cTypes.includes(code)) return 'C';
  if (eTypes.includes(code)) return 'E';
  return 'B';
}

function getDocTypeFromCode(code: number): string {
  const facturas = [1, 6, 11, 19, 51, 201, 206, 211];
  const nd = [2, 7, 12, 20, 52, 202, 207, 212];
  const nc = [3, 8, 13, 21, 53, 203, 208, 213];
  if (facturas.includes(code)) return 'factura';
  if (nd.includes(code)) return 'nota_debito';
  if (nc.includes(code)) return 'nota_credito';
  return 'factura';
}

// Map AFIP DocTipo to condition name
function getCondicionFromDocTipo(docTipo: number): string {
  switch (docTipo) {
    case 80: return 'responsable_inscripto'; // CUIT
    case 86: return 'monotributista'; // CUIL
    case 96: return 'consumidor_final'; // DNI
    case 99: return 'consumidor_final'; // Sin identificar
    default: return 'consumidor_final';
  }
}

// Parse AFIP date format YYYYMMDD to ISO
function parseAFIPDate(dateStr: string | number): Date {
  return parseAfipCalendarDate(dateStr) ?? new Date(String(dateStr));
}

/**
 * POST: Sincroniza facturas desde AFIP — importa los comprobantes faltantes
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const body = await req.json();
    const { pointOfSale, documentCodes } = body;

    if (!pointOfSale) {
      return NextResponse.json({ error: 'Punto de venta requerido' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const companyCuit = await getCompanyCuit(companyId);
    const codesToSync = documentCodes || ['1', '6', '11'];
    const imported: any[] = [];
    const errors: any[] = [];

    for (const code of codesToSync) {
      const codeNum = parseInt(code);
      const docCode = String(code).padStart(3, '0');
      
      try {
        const lastVoucher = await getLastAuthorizedVoucher(pointOfSale, codeNum, companyCuit);
        
        if (lastVoucher <= 0) continue;

        // Find which voucher numbers we already have locally
        const existingInvoices = await prisma.invoice.findMany({
          where: {
            companyId,
            pointOfSale,
            documentCode: docCode,
          },
          select: { sequenceNumber: true },
        });
        const existingNums = new Set(existingInvoices.map(i => i.sequenceNumber));

        // Find missing voucher numbers
        const missingNums: number[] = [];
        for (let n = 1; n <= lastVoucher; n++) {
          if (!existingNums.has(n)) {
            missingNums.push(n);
          }
        }

        if (missingNums.length === 0) continue;

        // Import each missing voucher (limit to 50 per type to avoid timeout)
        const toImport = missingNums.slice(0, 50);
        
        for (const voucherNum of toImport) {
          try {
            // Consult AFIP for voucher details
            const voucher = await consultVoucher(pointOfSale, codeNum, voucherNum, companyCuit);
            
            if (!voucher) {
              errors.push({ documentCode: docCode, number: voucherNum, error: 'No se encontró en ARCA' });
              continue;
            }

            const invoiceNumber = `${String(pointOfSale).padStart(4, '0')}-${String(voucherNum).padStart(8, '0')}`;
            const letter = getLetterFromCode(codeNum);
            const docType = getDocTypeFromCode(codeNum);
            const cae = voucher.CodAutorizacion || voucher.codAutorizacion || '';
            const caeVto = voucher.FchVto || voucher.fchVto || '';
            const fecha = voucher.CbteFch || voucher.cbteFch || '';
            const impTotal = parseFloat(voucher.ImpTotal || voucher.impTotal || '0');
            const impNeto = parseFloat(voucher.ImpNeto || voucher.impNeto || '0');
            const impIVA = parseFloat(voucher.ImpIVA || voucher.impIVA || '0');
            const impTrib = parseFloat(voucher.ImpTrib || voucher.impTrib || '0');
            const impOpEx = parseFloat(voucher.ImpOpEx || voucher.impOpEx || '0');
            const docTipo = parseInt(voucher.DocTipo || voucher.docTipo || '99');
            const docNro = String(voucher.DocNro || voucher.docNro || '0');
            const concepto = parseInt(voucher.Concepto || voucher.concepto || '1');
            const monId = voucher.MonId || voucher.monId || 'PES';
            const monCotiz = parseFloat(voucher.MonCotiz || voucher.monCotiz || '1');

            // Build an item from the totals (AFIP doesn't return line items)
            const items = [{
              name: `Importado desde ARCA — ${docType === 'factura' ? 'Factura' : docType === 'nota_credito' ? 'Nota de Crédito' : 'Nota de Débito'} ${letter}`,
              quantity: 1,
              unitPrice: impNeto || impTotal,
              discount: 0,
              ivaRate: impNeto > 0 ? Math.round((impIVA / impNeto) * 10000) / 100 : 0,
              ivaAmount: impIVA,
              subtotal: impNeto || impTotal,
            }];

            // Determine customer condition from doc type
            const customerCondition = getCondicionFromDocTipo(docTipo);

            // Create invoice record
            await prisma.invoice.create({
              data: {
                companyId,
                invoiceNumber,
                documentCode: docCode,
                documentType: docType,
                invoiceType: letter,
                pointOfSale,
                sequenceNumber: voucherNum,
                concept: concepto,
                customerName: docNro !== '0' ? `Doc. ${docNro}` : 'Consumidor Final',
                customerDocument: docNro !== '0' ? docNro : null,
                customerTaxCondition: customerCondition,
                subtotal: impNeto || impTotal,
                taxNetAmount: impNeto || 0,
                tax: impIVA,
                otherTaxes: impTrib,
                exemptAmount: impOpEx,
                total: impTotal,
                cae: cae || null,
                caeExpiration: caeVto ? parseAFIPDate(caeVto) : null,
                status: cae ? 'emitida' : 'pendiente',
                items: items,
                notes: `Importado desde ARCA el ${new Date().toLocaleDateString('es-AR')}. Moneda: ${monId}, Cotización: ${monCotiz}`,
                createdAt: fecha ? parseAFIPDate(fecha) : new Date(),
              },
            });

            imported.push({
              documentCode: docCode,
              number: voucherNum,
              invoiceNumber,
              total: impTotal,
              cae,
            });
          } catch (voucherError: any) {
            console.error(`[Sync] Error importing voucher ${docCode}-${voucherNum}:`, voucherError.message);
            errors.push({
              documentCode: docCode,
              number: voucherNum,
              error: voucherError.message || 'Error al consultar/importar',
            });
          }
        }

        // If there are more missing beyond the 50 limit
        if (missingNums.length > 50) {
          errors.push({
            documentCode: docCode,
            warning: `Hay ${missingNums.length - 50} comprobantes adicionales pendientes de importar. Volvé a sincronizar.`,
          });
        }
      } catch (error: any) {
        errors.push({
          documentCode: docCode,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      pointOfSale,
      imported,
      importedCount: imported.length,
      errors,
      message: imported.length > 0
        ? `Se importaron ${imported.length} comprobante(s) desde ARCA.`
        : errors.length > 0
        ? `No se pudieron importar comprobantes. Revisá los errores.`
        : `Todo sincronizado, no hay comprobantes faltantes.`,
    });

  } catch (error: any) {
    console.error('Error sincronizando facturas desde AFIP:', error);
    return NextResponse.json({ 
      error: 'Error al sincronizar con ARCA: ' + (error.message || '') 
    }, { status: 500 });
  }
}

/**
 * GET: Obtiene el estado de sincronización actual
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const pos = company.defaultPOS || 1;
    const companyCuit = await getCompanyCuit(companyId);

    const documentTypes = [
      { code: '1', name: 'Factura A' },
      { code: '6', name: 'Factura B' },
      { code: '11', name: 'Factura C' },
      { code: '3', name: 'NC A' },
      { code: '8', name: 'NC B' },
      { code: '13', name: 'NC C' },
      { code: '2', name: 'ND A' },
      { code: '7', name: 'ND B' },
      { code: '12', name: 'ND C' },
    ];

    const afipStatus = [];
    for (const docType of documentTypes) {
      try {
        const lastVoucher = await getLastAuthorizedVoucher(pos, parseInt(docType.code), companyCuit);
        const localCount = await prisma.invoice.count({
          where: {
            companyId,
            pointOfSale: pos,
            documentCode: docType.code.padStart(3, '0'),
          }
        });

        afipStatus.push({
          ...docType,
          lastVoucherAFIP: lastVoucher,
          localCount,
          synced: lastVoucher === localCount
        });
      } catch (error: any) {
        afipStatus.push({
          ...docType,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      pointOfSale: pos,
      cuit: companyCuit,
      status: afipStatus
    });

  } catch (error: any) {
    console.error('Error obteniendo estado de sincronización:', error);
    return NextResponse.json({ 
      error: 'Error al consultar ARCA: ' + (error.message || '') 
    }, { status: 500 });
  }
}
