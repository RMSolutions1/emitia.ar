// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { requestCAE, generateAFIPQR, getAFIPCredentials, getCompanyCuit, getLastAuthorizedVoucher } from '@/lib/afip';
import type { InvoiceRequest } from '@/lib/afip';
import { determineDocumentType, getDocumentLetter } from '@/lib/document-codes';
import { IVA_TIPOS } from '@/lib/afip/wsfev1';
import {
  formatAfipErrors,
  getCondicionIVAReceptorId,
  validateCAECompatibility,
} from '@/lib/afip/fiscal-mapping';
import { parseAfipCalendarDate } from '@/lib/afip/date-utils';

export const dynamic = 'force-dynamic';

// Map IVA rate to AFIP IVA ID
function getIvaId(taxRate: number): number {
  if (taxRate === 21) return 5;
  if (taxRate === 10.5) return 4;
  if (taxRate === 27) return 6;
  if (taxRate === 5) return 8;
  if (taxRate === 2.5) return 9;
  return 3; // 0%
}

// Map customer doc type to AFIP doc type
function getDocTipo(documentType?: string): number {
  if (documentType === 'CUIT') return 80;
  if (documentType === 'CUIL') return 86;
  if (documentType === 'DNI') return 96;
  return 99; // Consumidor Final / sin doc
}

// Map taxCondition to AFIP CondicionIVAReceptorId (delegado a fiscal-mapping)
function getCondicionIVAReceptorIdLegacy(taxCondition?: string): number {
  return getCondicionIVAReceptorId(taxCondition);
}

function getInvoiceTypeFromCode(code: string): string {
  const codeNum = parseInt(code);
  const aTypes = [1, 2, 3, 4, 5, 51, 52, 53];
  const bTypes = [6, 7, 8, 9, 10];
  const cTypes = [11, 12, 13, 15, 16];
  const eTypes = [19, 20, 21];
  const tTypes = [22];
  if (aTypes.includes(codeNum)) return 'A';
  if (bTypes.includes(codeNum)) return 'B';
  if (cTypes.includes(codeNum)) return 'C';
  if (eTypes.includes(codeNum)) return 'E';
  if (tTypes.includes(codeNum)) return 'T';
  return 'B';
}

/**
 * POST /api/pos/invoice
 * Creates a sale + invoice + requests CAE from AFIP in one atomic operation.
 * Body:
 * - saleId: string (existing sale ID)
 * - customerId?: string
 * - customerName: string
 * - customerDocument?: string
 * - customerDocumentType?: string
 * - customerTaxCondition?: string
 * - customerAddress?: string
 * - items: array of { productId, name, quantity, unitPrice, discount }
 * - total: number
 * - subtotal: number
 * - paymentMethod: string
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { requireTenant } = await import('@/lib/tenant');
    const scoped = requireTenant(session, request);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.companyId;

    const body = await request.json();
    const {
      saleId,
      customerId,
      customerName = 'Consumidor Final',
      customerDocument,
      customerDocumentType,
      customerTaxCondition = 'consumidor_final',
      customerAddress,
      items,
      total,
      subtotal,
      paymentMethod,
    } = body;

    // 1. Get company data for document type determination
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const emisorCondition = company.condicionIva || 'responsable_inscripto';
    const receptorCondition = customerTaxCondition || 'consumidor_final';

    // 2. Auto-determine document code (A, B, or C)
    const documentCode = determineDocumentType(
      emisorCondition,
      receptorCondition,
      'factura'
    );
    const documentLetter = getDocumentLetter(documentCode) || getInvoiceTypeFromCode(documentCode);
    const invoiceType = getInvoiceTypeFromCode(documentCode);
    const cbteTipo = parseInt(documentCode);

    // 3. Get next invoice number from AFIP (authoritative source)
    const pos = company.defaultPOS || 1;
    let sequenceNumber = company.nextInvoiceNum || 1;
    try {
      const companyCuitForNum = await getCompanyCuit(companyId);
      const lastAuthorized = await getLastAuthorizedVoucher(pos, cbteTipo, companyCuitForNum);
      sequenceNumber = lastAuthorized + 1;
    } catch (e) {
      console.warn('[POS] Could not get AFIP last voucher, using internal counter:', (e as any)?.message);
    }
    const prefix = company.invoicePrefix || 'FAC';

    // 4. Calculate IVA from items
    // For Factura B/C, prices include IVA. For Factura A, prices are neto.
    const isFacturaA = invoiceType === 'A';
    let netoGravado = 0;
    let ivaTotal = 0;
    const ivaBreakdown: { rate: number; base: number; amount: number }[] = [];
    
    const afipItems = (items || []).map((item: any) => {
      const qty = item.quantity || 1;
      const unitPrice = item.unitPrice || 0;
      const discount = item.discount || 0;
      const itemSubtotal = qty * unitPrice * (1 - discount / 100);
      
      let neto: number;
      let ivaRate = 21; // Default 21%
      let ivaId = 5;
      
      if (isFacturaA) {
        // For A: price is neto, add IVA separately
        neto = itemSubtotal;
      } else {
        // For B/C: price includes IVA, extract neto
        neto = itemSubtotal / 1.21;
      }
      
      const ivaAmount = neto * (ivaRate / 100);
      netoGravado += neto;
      ivaTotal += ivaAmount;
      
      // Update IVA breakdown
      const existingBreakdown = ivaBreakdown.find(b => b.rate === ivaRate);
      if (existingBreakdown) {
        existingBreakdown.base += neto;
        existingBreakdown.amount += ivaAmount;
      } else {
        ivaBreakdown.push({ rate: ivaRate, base: neto, amount: ivaAmount });
      }
      
      return {
        descripcion: item.name,
        cantidad: qty,
        precioUnitario: Math.round(neto / qty * 100) / 100,
        bonificacion: 0,
        ivaId,
      };
    });

    // 5. Create invoice in DB
    const invoiceNumber = `${String(pos).padStart(4, '0')}-${String(sequenceNumber).padStart(8, '0')}`;
    
    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber,
        invoiceType,
        documentCode,
        documentType: 'factura',
        pointOfSale: pos,
        sequenceNumber,
        concept: 1, // Productos
        customerName,
        customerDocument: customerDocument || null,
        customerTaxCondition: receptorCondition,
        customerAddress: customerAddress || null,
        customerId: customerId || null,
        saleId: saleId || null,
        subtotal: Math.round(netoGravado * 100) / 100,
        taxNetAmount: Math.round(netoGravado * 100) / 100,
        tax: Math.round(ivaTotal * 100) / 100,
        total: Math.round((isFacturaA ? netoGravado + ivaTotal : total) * 100) / 100,
        items: items ? (items as any) : undefined,
        status: 'pendiente',
      },
    });

    // Do not increment internal counter here — AFIP update will set the real number

    // 6. Request CAE from AFIP
    let cae = '';
    let caeVencimiento = '';
    let comprobanteNumero = 0;
    let qrUrl = '';
    let afipSuccess = false;
    let afipError = '';

    const { cuit: afipCuit } = getAFIPCredentials();
    const companyCuit = await getCompanyCuit(companyId);
    const cuitEmisor = companyCuit || afipCuit;

    try {
      const caeValidation = validateCAECompatibility({
        documentCode,
        emisorCondition: emisorCondition,
        receptorCondition,
        customerDocument,
      });
      if (!caeValidation.ok) {
        afipError = caeValidation.error || 'Tipo de comprobante incompatible';
        if (caeValidation.suggestedDocumentName) {
          afipError += `. Debe emitir ${caeValidation.suggestedDocumentName}.`;
        }
      } else {
      const invoiceReq: InvoiceRequest = {
        puntoVenta: pos,
        tipoComprobante: cbteTipo,
        concepto: 1,
        tipoDocumento: getDocTipo(customerDocumentType),
        nroDocumento: customerDocument || '0',
        items: afipItems,
        condicionIVAReceptorId: getCondicionIVAReceptorIdLegacy(receptorCondition),
        numeroComprobante: sequenceNumber,
        moneda: 'PES',
        cotizacion: 1,
      };

      const result = await requestCAE(invoiceReq, companyCuit);

      if (result.success && result.cae) {
        cae = result.cae;
        caeVencimiento = result.caeVencimiento || '';
        comprobanteNumero = result.comprobanteNumero || 0;
        afipSuccess = true;

        // Generate QR
        const today = new Date();
        const fechaStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const totalAmount = afipItems.reduce((sum: number, item: any) => {
          const subtotal = item.cantidad * item.precioUnitario - (item.bonificacion || 0);
          const ivaRate = IVA_TIPOS[item.ivaId]?.alicuota ?? 21;
          return sum + subtotal + (subtotal * ivaRate / 100);
        }, 0);

        qrUrl = generateAFIPQR({
          ver: 1,
          fecha: fechaStr,
          cuit: cuitEmisor,
          ptoVta: pos,
          tipoCmp: cbteTipo,
          nroCmp: comprobanteNumero,
          importe: Math.round(totalAmount * 100) / 100,
          moneda: 'PES',
          ctz: 1,
          tipoDocRec: getDocTipo(customerDocumentType),
          nroDocRec: customerDocument || '0',
          tipoCodAut: 'E',
          codAut: cae,
        });

        // Update invoice with CAE
        const caeExpDate = caeVencimiento
          ? parseAfipCalendarDate(caeVencimiento)
          : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            cae,
            caeExpiration: caeExpDate,
            status: 'emitida',
            invoiceNumber: `${String(pos).padStart(4, '0')}-${String(comprobanteNumero).padStart(8, '0')}`,
            sequenceNumber: comprobanteNumero,
          },
        });

        // Sync company's internal counter with AFIP
        await prisma.company.update({
          where: { id: companyId },
          data: { nextInvoiceNum: comprobanteNumero + 1 },
        }).catch(e => console.warn('[POS] Could not sync nextInvoiceNum:', e.message));
      } else {
        afipError = formatAfipErrors(result.errores, result.observaciones);
        console.error('[POS AFIP Error]', result.errores, result.observaciones);
      }
      }
    } catch (err: any) {
      afipError = err.message || 'Error de conexión con AFIP';
      console.error('[POS AFIP Exception]', err);
    }

    // Parse CAE expiration for response
    let caeExpiration: Date | null = null;
    if (caeVencimiento) {
      caeExpiration = parseAfipCalendarDate(caeVencimiento);
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: afipSuccess
          ? `${String(pos).padStart(4, '0')}-${String(comprobanteNumero).padStart(8, '0')}`
          : invoice.invoiceNumber,
        invoiceType,
        documentCode,
        documentLetter: invoiceType,
        pointOfSale: pos,
        sequenceNumber: afipSuccess ? comprobanteNumero : sequenceNumber,
        customerName,
        customerDocument,
        customerDocumentType,
        customerTaxCondition: receptorCondition,
        customerAddress,
        subtotal: Math.round(netoGravado * 100) / 100,
        netoGravado: Math.round(netoGravado * 100) / 100,
        ivaTotal: Math.round(ivaTotal * 100) / 100,
        ivaBreakdown,
        total: Math.round((isFacturaA ? netoGravado + ivaTotal : total) * 100) / 100,
        items,
      },
      afip: {
        success: afipSuccess,
        cae: cae || null,
        caeVencimiento: caeExpiration?.toISOString() || null,
        comprobanteNumero,
        qrUrl: qrUrl || null,
        error: afipError || null,
      },
      company: {
        businessName: company.name,
        legalName: company.legalName,
        cuit: company.cuit,
        condicionIva: company.condicionIva,
        address: company.address,
        city: company.city,
        province: company.province,
        phone: company.phone,
        email: company.email,
        iibb: company.iibb,
        logo: company.logo,
        website: company.website,
        fechaInicioActividad: company.fechaInicioActividad ? company.fechaInicioActividad.toISOString().split('T')[0] : null,
        defaultPOS: company.defaultPOS,
      },
    });
  } catch (error: any) {
    console.error('[POS Invoice Error]', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar factura desde POS' },
      { status: 500 }
    );
  }
}
