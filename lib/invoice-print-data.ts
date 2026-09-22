import { getDocumentLetter } from '@/lib/document-codes';
import type { DocumentCompany, DocumentCustomer, DocumentData, DocumentItem } from '@/components/print-document';

export interface InvoicePrintSource {
  id?: string;
  invoiceNumber: string;
  documentCode?: string;
  documentType?: string;
  invoiceType?: string;
  pointOfSale?: number;
  sequenceNumber?: number;
  customerName?: string;
  customerDocument?: string;
  customerTaxCondition?: string;
  customerAddress?: string;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  otherTaxes?: number;
  exemptAmount?: number;
  total: number;
  items?: unknown;
  cae?: string;
  caeExpiration?: string;
  concept?: number;
  serviceStartDate?: string;
  serviceEndDate?: string;
  paymentDueDate?: string;
  observations?: string;
  notes?: string;
  createdAt: string;
}

export interface BusinessPrintConfig {
  businessName?: string;
  legalName?: string;
  cuit?: string;
  iibb?: string;
  condicionIva?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  website?: string;
  fechaInicioActividad?: string;
  inicioActividades?: string;
  logo?: string;
  defaultPOS?: number;
}

const IVA_RATES: Record<number, number> = { 3: 0, 4: 10.5, 5: 21, 6: 27, 8: 5, 9: 2.5 };

function getDocTypeFromCode(code?: string): DocumentData['documentType'] {
  if (!code) return 'factura';
  const codeNum = parseInt(code, 10);
  const nc = [3, 8, 13, 21, 53, 203, 208, 213];
  const nd = [2, 7, 12, 20, 52, 202, 207, 212];
  if (nc.includes(codeNum)) return 'nota_credito';
  if (nd.includes(codeNum)) return 'nota_debito';
  return 'factura';
}

function getIvaRate(ivaId?: number, taxRate?: number): number {
  if (taxRate != null && taxRate > 0) return taxRate;
  if (ivaId != null && IVA_RATES[ivaId] != null) return IVA_RATES[ivaId];
  return 21;
}

export function parseInvoiceItems(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getCorrectLetter(inv: InvoicePrintSource): string {
  if (inv.documentCode) {
    const derived = getDocumentLetter(inv.documentCode);
    if (derived) return derived;
  }
  return inv.invoiceType || 'B';
}

function buildCustomer(inv: InvoicePrintSource): DocumentCustomer {
  const rawDoc = (inv.customerDocument || '').trim();
  const digits = rawDoc.replace(/\D/g, '');
  const isCuit = digits.length === 11;

  return {
    name: inv.customerName || 'Consumidor Final',
    cuit: isCuit ? digits : undefined,
    document: !isCuit && rawDoc ? rawDoc : undefined,
    condicionIva: inv.customerTaxCondition,
    address: inv.customerAddress,
  };
}

function mapItems(rawItems: Array<Record<string, unknown>>, letter: string, inv: InvoicePrintSource): DocumentItem[] {
  const mapped = rawItems.map((item) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const discount = Number(item.discount) || 0;
    const ivaRate = Number(item.ivaRate ?? item.taxRate) || getIvaRate(item.ivaId as number | undefined, inv.taxRate);
    const subtotal =
      Number(item.subtotal ?? item.total) ||
      qty * unitPrice * (1 - discount / 100);
    const ivaAmount =
      Number(item.ivaAmount) ||
      (letter === 'A' ? subtotal * (ivaRate / 100) : 0);

    return {
      name: String(item.name || item.description || 'Ítem'),
      description: item.description ? String(item.description) : undefined,
      code: item.code ? String(item.code) : undefined,
      unit: item.unit ? String(item.unit) : 'UNIDAD',
      quantity: qty,
      unitPrice,
      discount,
      ivaRate,
      ivaAmount,
      subtotal,
    };
  });

  if (mapped.length > 0) return mapped;

  const base = inv.subtotal || inv.total || 0;
  const docType = getDocTypeFromCode(inv.documentCode);
  const summaryLabel =
    docType === 'nota_credito'
      ? 'Nota de crédito — resumen de operación'
      : docType === 'nota_debito'
        ? 'Nota de débito — resumen de operación'
        : 'Operación comercial — detalle no informado en ítems';

  return [
    {
      name: summaryLabel,
      quantity: 1,
      unitPrice: base,
      unit: 'UNIDAD',
      ivaRate: letter === 'A' ? (inv.taxRate || 21) : 21,
      ivaAmount: letter === 'A' ? (inv.tax || 0) : 0,
      subtotal: base,
    },
  ];
}

function buildIvaBreakdown(items: DocumentItem[], letter: string, inv: InvoicePrintSource) {
  if (letter !== 'A') return undefined;

  const byRate = new Map<number, { base: number; amount: number }>();
  for (const item of items) {
    const rate = item.ivaRate ?? 21;
    const base = item.subtotal || 0;
    const amount = item.ivaAmount ?? base * (rate / 100);
    const current = byRate.get(rate) || { base: 0, amount: 0 };
    byRate.set(rate, { base: current.base + base, amount: current.amount + amount });
  }

  if (byRate.size === 0 && (inv.tax || 0) > 0) {
    return [{ rate: inv.taxRate || 21, base: inv.subtotal || 0, amount: inv.tax || 0 }];
  }

  return Array.from(byRate.entries()).map(([rate, v]) => ({
    rate,
    base: v.base,
    amount: v.amount,
  }));
}

export function buildInvoicePrintData(
  inv: InvoicePrintSource,
  businessConfig?: BusinessPrintConfig | null,
) {
  const letter = getCorrectLetter(inv);
  const rawItems = parseInvoiceItems(inv.items);
  const items = mapItems(rawItems, letter, inv);

  const company: DocumentCompany = {
    businessName: businessConfig?.businessName || '',
    legalName: businessConfig?.legalName,
    cuit: businessConfig?.cuit,
    iibb: businessConfig?.iibb,
    condicionIva: businessConfig?.condicionIva,
    address: businessConfig?.address,
    city: businessConfig?.city,
    province: businessConfig?.province,
    phone: businessConfig?.phone,
    email: businessConfig?.email,
    website: businessConfig?.website,
    fechaInicioActividad: businessConfig?.fechaInicioActividad || businessConfig?.inicioActividades,
    logo: businessConfig?.logo,
    defaultPOS: businessConfig?.defaultPOS || inv.pointOfSale,
  };

  const customer = buildCustomer(inv);
  const ivaBreakdown = buildIvaBreakdown(items, letter, inv);

  const docData: DocumentData = {
    documentType: getDocTypeFromCode(inv.documentCode),
    documentLetter: letter as DocumentData['documentLetter'],
    documentCode: inv.documentCode ? String(inv.documentCode).padStart(3, '0') : undefined,
    documentNumber: inv.invoiceNumber,
    pointOfSale: inv.pointOfSale || 1,
    date: new Date(inv.createdAt),
    dueDate: inv.paymentDueDate ? new Date(inv.paymentDueDate) : undefined,
    items,
    subtotal: inv.subtotal ?? items.reduce((s, i) => s + (i.subtotal || 0), 0),
    ivaTotal: inv.tax || 0,
    ivaBreakdown,
    otherTaxes: inv.otherTaxes || 0,
    exento: inv.exemptAmount || 0,
    netoGravado: inv.subtotal || 0,
    total: inv.total,
    cae: inv.cae,
    caeExpiration: inv.caeExpiration,
    concept: inv.concept,
    serviceStartDate: inv.serviceStartDate,
    serviceEndDate: inv.serviceEndDate,
    observations: inv.observations || inv.notes,
    currency: 'ARS',
    template: 'profesional',
  };

  return { company, customer, docData };
}

/** Valida que un comprobante pueda renderizarse sin errores obvios. */
export function validatePrintData(data: {
  company: DocumentCompany;
  customer: DocumentCustomer;
  docData: DocumentData;
}): string[] {
  const issues: string[] = [];
  const { company, docData } = data;

  if (!company.businessName && !company.legalName) {
    issues.push('Falta razón social de la empresa');
  }
  if (!company.cuit) {
    issues.push('Falta CUIT del emisor');
  }
  if (!docData.documentNumber) {
    issues.push('Falta número de comprobante');
  }
  if (Number.isNaN(new Date(docData.date).getTime())) {
    issues.push('Fecha de emisión inválida');
  }
  if (!docData.items.length) {
    issues.push('Sin ítems para imprimir');
  }
  if (docData.total == null || Number.isNaN(docData.total)) {
    issues.push('Total inválido');
  }
  if (docData.cae && docData.cae !== 'PENDIENTE' && !company.cuit) {
    issues.push('CAE presente pero falta CUIT para QR fiscal');
  }

  return issues;
}
