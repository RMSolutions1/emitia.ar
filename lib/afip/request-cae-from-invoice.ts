import prisma from '@/lib/db';
import {
  consultVoucher,
  generateAFIPQR,
  getCompanyCuit,
  getLastAuthorizedVoucher,
  requestCAE,
} from '@/lib/afip';
import type { InvoiceRequest } from '@/lib/afip';
import { IVA_TIPOS } from '@/lib/afip/wsfev1';
import {
  formatAfipErrors,
  getCondicionIVAReceptorId,
  getDocTipoFromDocument,
  getIvaIdFromRate,
  validateCAECompatibility,
} from '@/lib/afip/fiscal-mapping';
import {
  fetchPersonaFromAfip,
  mergeCustomerWithPersona,
} from '@/lib/afip/customer-enrichment';
import { parseAfipCalendarDate, toAfipDateString } from '@/lib/afip/date-utils';

type InvoiceRecord = Awaited<ReturnType<typeof loadInvoice>>;

async function loadInvoice(invoiceId: string, companyId: string | null, isSuperadmin: boolean, isSystem = false) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { company: true },
  });
  if (!invoice) throw new Error('Comprobante no encontrado');
  if (!isSuperadmin && !isSystem && companyId && invoice.companyId !== companyId) {
    throw new Error('Sin acceso a este comprobante');
  }
  if (invoice.cae && invoice.cae.trim() !== '' && invoice.cae !== 'PENDIENTE') {
    throw new Error('Este comprobante ya tiene CAE autorizado');
  }
  if (invoice.status === 'anulada') {
    throw new Error('No se puede solicitar CAE para un comprobante anulado');
  }
  return invoice;
}

async function enrichInvoiceCustomerFromAfip(invoice: InvoiceRecord): Promise<InvoiceRecord> {
  const cleanDoc = (invoice.customerDocument || '').replace(/\D/g, '');
  if (cleanDoc.length !== 11) return invoice;

  const needsEnrichment =
    !invoice.customerAddress?.trim() ||
    !invoice.customerTaxCondition ||
    invoice.customerTaxCondition === 'consumidor_final';

  if (!needsEnrichment) return invoice;

  const persona = await fetchPersonaFromAfip(cleanDoc, await getCompanyCuit(invoice.companyId));
  if (!persona) return invoice;

  const merged = mergeCustomerWithPersona(
    {
      document: cleanDoc,
      documentType: 'CUIT',
      address: invoice.customerAddress,
      taxCondition: invoice.customerTaxCondition,
    },
    persona,
    'CUIT',
  );

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      customerTaxCondition: merged.taxCondition || invoice.customerTaxCondition,
      customerAddress: merged.address || merged.city || invoice.customerAddress,
      customerName: invoice.customerName || merged.name || invoice.customerName,
    },
    include: { company: true },
  });

  if (invoice.customerId) {
    await prisma.customer.update({
      where: { id: invoice.customerId },
      data: {
        taxCondition: merged.taxCondition,
        address: merged.address || undefined,
        city: merged.city || undefined,
        province: merged.province || undefined,
      },
    }).catch(() => {});
  }

  return updated;
}

function buildItemsFromInvoice(invoice: InvoiceRecord): InvoiceRequest['items'] {
  const rawItems = (invoice.items as any[]) || [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('El comprobante no tiene ítems para autorizar');
  }

  return rawItems.map((item) => {
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPrice || 0);
    const discount = Number(item.discount || 0);
    const taxRate = Number(item.taxRate ?? item.ivaRate ?? 21);
    return {
      descripcion: item.description || item.name || 'Ítem',
      cantidad: qty,
      precioUnitario: unitPrice * (1 - discount / 100),
      bonificacion: 0,
      ivaId: getIvaIdFromRate(taxRate),
    };
  });
}

function buildInvoiceRequest(invoice: InvoiceRecord): InvoiceRequest {
  const cleanDoc = (invoice.customerDocument || '').replace(/\D/g, '') || '0';
  const docTipo = cleanDoc === '0' ? 99 : getDocTipoFromDocument(cleanDoc);

  return {
    puntoVenta: invoice.pointOfSale,
    tipoComprobante: parseInt(invoice.documentCode || '006', 10),
    concepto: invoice.concept || 1,
    tipoDocumento: docTipo,
    nroDocumento: cleanDoc,
    items: buildItemsFromInvoice(invoice),
    condicionIVAReceptorId: getCondicionIVAReceptorId(invoice.customerTaxCondition),
    numeroComprobante: invoice.sequenceNumber,
    fechaServicioDesde: invoice.serviceStartDate
      ? formatAfipDate(invoice.serviceStartDate)
      : undefined,
    fechaServicioHasta: invoice.serviceEndDate
      ? formatAfipDate(invoice.serviceEndDate)
      : undefined,
    fechaVencimientoPago: invoice.paymentDueDate
      ? formatAfipDate(invoice.paymentDueDate)
      : undefined,
    moneda: 'PES',
    cotizacion: 1,
  };
}

function formatAfipDate(d: Date): string {
  return toAfipDateString(d);
}

function parseAfipDate(yyyymmdd: string): Date {
  return parseAfipCalendarDate(yyyymmdd) ?? new Date(NaN);
}

export async function requestCAEForInvoice(invoiceId: string, session: { companyId?: string | null; role?: string }) {
  const companyId = session.companyId || null;
  const isSuperadmin = session.role === 'superadmin';
  const isSystem = session.role === 'system';
  const invoice = await loadInvoice(invoiceId, companyId, isSuperadmin, isSystem);
  const enrichedInvoice = await enrichInvoiceCustomerFromAfip(invoice);

  const validation = validateCAECompatibility({
    documentCode: enrichedInvoice.documentCode || '006',
    emisorCondition: enrichedInvoice.company?.condicionIva,
    receptorCondition: enrichedInvoice.customerTaxCondition,
    customerDocument: enrichedInvoice.customerDocument,
  });
  if (!validation.ok) {
    return {
      success: false,
      error: validation.error,
      suggestedDocumentCode: validation.suggestedDocumentCode,
      suggestedDocumentName: validation.suggestedDocumentName,
    };
  }

  const companyCuit = await getCompanyCuit(enrichedInvoice.companyId);
  const cbteTipo = parseInt(enrichedInvoice.documentCode || '006', 10);
  const pos = enrichedInvoice.pointOfSale;
  const seq = enrichedInvoice.sequenceNumber;

  if (!seq || seq < 1) {
    return {
      success: false,
      error: 'El comprobante no tiene número de secuencia asignado. No se puede solicitar CAE.',
    };
  }

  // Si AFIP ya autorizó este número, sincronizar CAE desde ARCA
  try {
    const existing = await consultVoucher(pos, cbteTipo, seq, companyCuit);
    if (existing?.CodAutorizacion) {
      const cae = String(existing.CodAutorizacion);
      const caeExpiration = existing.FchVto ? parseAfipDate(String(existing.FchVto)) : null;
      await prisma.invoice.update({
        where: { id: enrichedInvoice.id },
        data: {
          cae,
          caeExpiration,
          status: 'emitida',
        },
      });
      return {
        success: true,
        cae,
        caeVencimiento: existing.FchVto,
        comprobanteNumero: seq,
        syncedFromAfip: true,
        message: 'CAE recuperado desde AFIP (comprobante ya estaba autorizado)',
      };
    }
  } catch {
    // No existe en AFIP — continuar con solicitud
  }

  const lastAuthorized = await getLastAuthorizedVoucher(pos, cbteTipo, companyCuit);
  if (seq <= lastAuthorized) {
    return {
      success: false,
      error: `El número ${String(pos).padStart(4, '0')}-${String(seq).padStart(8, '0')} ya fue utilizado en AFIP (último autorizado: ${lastAuthorized}). Creá un nuevo comprobante.`,
      lastAuthorized,
    };
  }

  if (seq > lastAuthorized + 1) {
    return {
      success: false,
      error: `Hay un salto de numeración. AFIP espera el número ${lastAuthorized + 1} y este comprobante es el ${seq}.`,
      lastAuthorized,
      expectedNumber: lastAuthorized + 1,
    };
  }

  const invoiceReq = buildInvoiceRequest(enrichedInvoice);
  const result = await requestCAE(invoiceReq, companyCuit);

  if (result.success && result.cae) {
    const items = buildItemsFromInvoice(enrichedInvoice);
    const totalAmount = items.reduce((sum, item) => {
      const subtotal = item.cantidad * item.precioUnitario - (item.bonificacion || 0);
      const ivaRate = IVA_TIPOS[item.ivaId]?.alicuota ?? 21;
      return sum + subtotal + (subtotal * ivaRate) / 100;
    }, 0);

    const today = new Date();
    const fechaStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const qrUrl = generateAFIPQR({
      ver: 1,
      fecha: fechaStr,
      cuit: companyCuit || enrichedInvoice.company?.cuit || '',
      ptoVta: pos,
      tipoCmp: cbteTipo,
      nroCmp: result.comprobanteNumero!,
      importe: Math.round(totalAmount * 100) / 100,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: invoiceReq.tipoDocumento,
      nroDocRec: invoiceReq.nroDocumento,
      tipoCodAut: 'E',
      codAut: result.cae,
    });

    const realInvoiceNumber = `${String(pos).padStart(4, '0')}-${String(result.comprobanteNumero).padStart(8, '0')}`;

    await prisma.invoice.update({
      where: { id: enrichedInvoice.id },
      data: {
        cae: result.cae,
        caeExpiration: result.caeVencimiento
          ? parseAfipDate(String(result.caeVencimiento))
          : null,
        status: 'emitida',
        invoiceNumber: realInvoiceNumber,
        sequenceNumber: result.comprobanteNumero,
      },
    });

    await prisma.company.update({
      where: { id: enrichedInvoice.companyId },
      data: { nextInvoiceNum: (result.comprobanteNumero || 0) + 1 },
    }).catch(() => undefined);

    return {
      success: true,
      cae: result.cae,
      caeVencimiento: result.caeVencimiento,
      comprobanteNumero: result.comprobanteNumero,
      invoiceNumber: realInvoiceNumber,
      qrUrl,
      observaciones: result.observaciones,
    };
  }

  return {
    success: false,
    error: formatAfipErrors(result.errores, result.observaciones),
    errores: result.errores,
    observaciones: result.observaciones,
    resultado: result.resultado,
  };
}
