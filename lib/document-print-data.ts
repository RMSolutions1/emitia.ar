import type { DocumentCompany, DocumentCustomer, DocumentData, DocumentItem } from '@/components/print-document';
import {
  buildInvoicePrintData,
  parseInvoiceItems,
  type BusinessPrintConfig,
  type InvoicePrintSource,
} from '@/lib/invoice-print-data';

export { buildInvoicePrintData, validatePrintData, parseInvoiceItems } from '@/lib/invoice-print-data';
export type { BusinessPrintConfig, InvoicePrintSource };

export function buildCompanyFromConfig(config?: BusinessPrintConfig | null): DocumentCompany {
  return {
    businessName: config?.businessName || 'Mi Empresa',
    legalName: config?.legalName,
    cuit: config?.cuit,
    iibb: config?.iibb,
    condicionIva: config?.condicionIva,
    address: config?.address,
    city: config?.city,
    province: config?.province,
    phone: config?.phone,
    email: config?.email,
    website: config?.website,
    fechaInicioActividad: config?.fechaInicioActividad || config?.inicioActividades,
    logo: config?.logo,
    defaultPOS: config?.defaultPOS,
  };
}

export interface QuotePrintSource {
  quoteNumber: string;
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  validUntil?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  items?: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    subtotal?: number;
  }>;
}

export function buildQuotePrintData(quote: QuotePrintSource, config?: BusinessPrintConfig | null) {
  const company = buildCompanyFromConfig(config);
  const customer: DocumentCustomer = {
    name: quote.customerName || 'Cliente',
    condicionIva: 'consumidor_final',
  };

  const items: DocumentItem[] = (quote.items || []).map((item) => ({
    name: item.productName,
    description: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount || 0,
    ivaRate: 21,
    subtotal: item.subtotal ?? item.quantity * item.unitPrice,
  }));

  const validUntilNote = quote.validUntil
    ? `Válido hasta: ${new Date(quote.validUntil).toLocaleDateString('es-AR')}`
    : undefined;

  const docData: DocumentData = {
    documentType: 'presupuesto',
    documentLetter: 'X',
    documentNumber: quote.quoteNumber.replace(/^P-/, ''),
    pointOfSale: 1,
    date: new Date(quote.createdAt),
    items,
    subtotal: quote.subtotal,
    ivaTotal: quote.tax,
    discount: quote.discount,
    total: quote.total,
    observations: [quote.notes, quote.terms, validUntilNote].filter(Boolean).join(' · ') || undefined,
    template: 'profesional',
    currency: 'ARS',
  };

  return { company, customer, docData };
}

export interface TicketPrintSource {
  ticketNumber?: string;
  sequenceNumber?: number;
  pointOfSale?: number;
  customerName?: string;
  subtotal?: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  cashReceived?: number;
  change?: number;
  observations?: string;
  createdAt: string;
  items?: unknown;
}

export function buildTicketPrintData(ticket: TicketPrintSource, config?: BusinessPrintConfig | null) {
  const company = buildCompanyFromConfig(config);
  const customer: DocumentCustomer = {
    name: ticket.customerName || 'Consumidor Final',
    condicionIva: 'consumidor_final',
  };

  const rawItems = parseInvoiceItems(ticket.items);
  const items: DocumentItem[] = rawItems.map((item) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const discount = Number(item.discount) || 0;
    return {
      name: String(item.description || item.name || 'Producto'),
      description: item.description ? String(item.description) : undefined,
      quantity: qty,
      unitPrice,
      discount,
      subtotal: Number(item.total ?? item.subtotal) || qty * unitPrice,
    };
  });

  const docNumber =
    ticket.ticketNumber ||
    String(ticket.sequenceNumber ?? 0).padStart(8, '0');

  const docData: DocumentData = {
    documentType: 'ticket',
    documentLetter: 'X',
    documentNumber: docNumber,
    pointOfSale: ticket.pointOfSale || config?.defaultPOS || 1,
    date: new Date(ticket.createdAt),
    items,
    subtotal: ticket.subtotal ?? items.reduce((s, i) => s + i.subtotal, 0),
    discount: ticket.discount,
    total: ticket.total,
    paymentMethod: ticket.paymentMethod,
    cashReceived: ticket.cashReceived,
    change: ticket.change,
    observations: ticket.observations,
    printFormat: 'ticket',
    template: 'profesional',
    currency: 'ARS',
  };

  return { company, customer, docData };
}

export interface RemitoPrintSource {
  invoiceNumber: string;
  pointOfSale?: number;
  customerName?: string;
  customerDocument?: string;
  customerAddress?: string;
  customerTaxCondition?: string;
  items?: unknown;
  transportInfo?: string;
  observations?: string;
  notes?: string;
  createdAt?: string;
}

export function buildRemitoPrintData(remito: RemitoPrintSource, config?: BusinessPrintConfig | null) {
  const company = buildCompanyFromConfig(config);
  const customer: DocumentCustomer = {
    name: remito.customerName || 'Cliente',
    document: remito.customerDocument,
    condicionIva: remito.customerTaxCondition,
    address: remito.customerAddress,
  };

  const rawItems = parseInvoiceItems(remito.items);
  const remitoItems = rawItems.map((item) => ({
    name: String(item.description || item.name || 'Ítem'),
    quantity: Number(item.quantity) || 1,
    unit: String(item.unit || 'u'),
  }));

  const docData: DocumentData = {
    documentType: 'remito',
    documentLetter: 'X',
    documentNumber: remito.invoiceNumber,
    pointOfSale: remito.pointOfSale || config?.defaultPOS || 1,
    date: remito.createdAt ? new Date(remito.createdAt) : new Date(),
    items: [],
    remitoItems,
    subtotal: 0,
    total: 0,
    transportInfo: remito.transportInfo || remito.notes,
    observations: remito.observations,
    template: 'profesional',
    currency: 'ARS',
  };

  return { company, customer, docData };
}

/** POS / venta rápida sin factura fiscal */
export interface PosSalePrintSource {
  saleNumber: string;
  date: Date;
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  cashReceived?: number;
  change?: number;
  items: Array<{ name: string; quantity: number; price: number; discount?: number; subtotal: number }>;
}

export function buildPosTicketPrintData(
  sale: PosSalePrintSource,
  config?: BusinessPrintConfig | null,
  customer?: DocumentCustomer,
) {
  const company = buildCompanyFromConfig(config);
  const items: DocumentItem[] = sale.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.price,
    discount: item.discount || 0,
    subtotal: item.subtotal,
  }));

  const docData: DocumentData = {
    documentType: 'ticket',
    documentLetter: 'X',
    documentNumber: sale.saleNumber,
    pointOfSale: config?.defaultPOS || 1,
    date: sale.date,
    items,
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    cashReceived: sale.cashReceived,
    change: sale.change,
    printFormat: 'ticket',
    template: 'profesional',
    currency: 'ARS',
  };

  return { company, customer, docData };
}
