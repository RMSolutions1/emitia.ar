import prisma from '@/lib/db';
import { getCompanyCuit, getLastAuthorizedVoucher } from '@/lib/afip';
import { determineDocumentType } from '@/lib/document-codes';
import { requestCAEForInvoice } from '@/lib/afip/request-cae-from-invoice';
import { validateCAECompatibility } from '@/lib/afip/fiscal-mapping';

export interface RecurringProcessResult {
  success: boolean;
  recurringId: string;
  invoiceId?: string;
  invoiceNumber?: string;
  cae?: string;
  error?: string;
  suggestedDocumentName?: string;
}

function getInvoiceTypeFromCode(code: string): string {
  const n = parseInt(code, 10);
  if ([1, 2, 3, 51, 52, 53].includes(n)) return 'A';
  if ([6, 7, 8, 9, 10].includes(n)) return 'B';
  if ([11, 12, 13, 15, 16].includes(n)) return 'C';
  return 'B';
}

export function getNextEmissionDate(from: Date, frequency: string, dayOfMonth: number): Date {
  const d = new Date(from);
  switch (frequency) {
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'bimonthly':
      d.setMonth(d.getMonth() + 2);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'semiannual':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'annual':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dayOfMonth, lastDay));
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Emite una factura recurrente con CAE de AFIP (comprobante legal). */
export async function processRecurringInvoice(recurringId: string): Promise<RecurringProcessResult> {
  const recurring = await prisma.recurringInvoice.findUnique({ where: { id: recurringId } });
  if (!recurring) {
    return { success: false, recurringId, error: 'Factura recurrente no encontrada' };
  }
  if (!recurring.isActive) {
    return { success: false, recurringId, error: 'La recurrente está pausada' };
  }
  if (recurring.endDate && new Date(recurring.endDate) < new Date()) {
    return { success: false, recurringId, error: 'La recurrente ya finalizó' };
  }

  const company = await prisma.company.findUnique({ where: { id: recurring.companyId } });
  if (!company) {
    return { success: false, recurringId, error: 'Empresa no encontrada' };
  }

  const documentCode = determineDocumentType(
    company.condicionIva || 'responsable_inscripto',
    recurring.customerTaxCondition,
    'factura',
  );
  const invoiceType = getInvoiceTypeFromCode(documentCode);
  const pos = recurring.pointOfSale || company.defaultPOS || 1;
  const cbteTipo = parseInt(documentCode, 10);

  const validation = validateCAECompatibility({
    documentCode,
    emisorCondition: company.condicionIva,
    receptorCondition: recurring.customerTaxCondition,
    customerDocument: recurring.customerDocument,
  });
  if (!validation.ok) {
    return {
      success: false,
      recurringId,
      error: validation.error,
      suggestedDocumentName: validation.suggestedDocumentName,
    };
  }

  let sequenceNumber = company.nextInvoiceNum || 1;
  try {
    const cuit = await getCompanyCuit(recurring.companyId);
    const lastAuthorized = await getLastAuthorizedVoucher(pos, cbteTipo, cuit);
    sequenceNumber = lastAuthorized + 1;
  } catch (e) {
    console.warn('[Recurring] No se pudo consultar último comprobante AFIP:', (e as Error).message);
  }

  const invoiceNumber = `${String(pos).padStart(4, '0')}-${String(sequenceNumber).padStart(8, '0')}`;
  const rawItems = (recurring.items as unknown[]) || [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { success: false, recurringId, error: 'La recurrente no tiene ítems' };
  }

  const invoice = await prisma.invoice.create({
    data: {
      companyId: recurring.companyId,
      invoiceNumber,
      invoiceType,
      documentCode,
      documentType: 'factura',
      pointOfSale: pos,
      sequenceNumber,
      concept: recurring.concept || 2,
      customerName: recurring.customerName,
      customerDocument: recurring.customerDocument,
      customerTaxCondition: recurring.customerTaxCondition,
      customerAddress: recurring.customerAddress,
      customerId: recurring.customerId,
      subtotal: recurring.subtotal,
      taxNetAmount: recurring.subtotal,
      tax: recurring.tax,
      total: recurring.total,
      items: rawItems as object,
      notes: recurring.observations,
      status: 'pendiente',
    },
  });

  const caeResult = await requestCAEForInvoice(invoice.id, {
    companyId: recurring.companyId,
    role: 'system',
  });

  if (caeResult.success) {
    const now = new Date();
    await prisma.recurringInvoice.update({
      where: { id: recurringId },
      data: {
        lastEmissionDate: now,
        nextEmissionDate: getNextEmissionDate(now, recurring.frequency, recurring.dayOfMonth),
        totalEmitted: recurring.totalEmitted + 1,
        documentCode,
        invoiceType,
      },
    });

    return {
      success: true,
      recurringId,
      invoiceId: invoice.id,
      invoiceNumber: caeResult.invoiceNumber || invoiceNumber,
      cae: caeResult.cae,
    };
  }

  return {
    success: false,
    recurringId,
    invoiceId: invoice.id,
    invoiceNumber,
    error: caeResult.error || 'AFIP rechazó la solicitud de CAE',
    suggestedDocumentName: caeResult.suggestedDocumentName,
  };
}

/** Procesa todas las recurrentes vencidas (para cron o botón manual). */
export async function processDueRecurringInvoices(companyId?: string) {
  const now = new Date();
  const due = await prisma.recurringInvoice.findMany({
    where: {
      isActive: true,
      nextEmissionDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
      ...(companyId ? { companyId } : {}),
    },
    orderBy: { nextEmissionDate: 'asc' },
  });

  const results: RecurringProcessResult[] = [];
  for (const r of due) {
    results.push(await processRecurringInvoice(r.id));
  }

  return {
    processed: results.length,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}
