'use client';

import { useRef, useState } from 'react';
import { Printer, X, Download, Layout, FileText } from 'lucide-react';
import { numberToWords } from '@/lib/number-to-words';
import { formatAfipCalendarDate } from '@/lib/afip/date-utils';
import { buildFiscalQrPayload, buildFiscalQrUrl, buildFiscalQrImageUrl } from '@/lib/fiscal-qr';

// ============ TYPES ============
export interface DocumentItem {
  name: string;
  description?: string;
  code?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  ivaRate?: number;
  ivaAmount?: number;
  subtotal: number;
}

export interface DocumentCompany {
  businessName: string;
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
  logo?: string;
  defaultPOS?: number;
}

export interface DocumentCustomer {
  name: string;
  cuit?: string;
  document?: string;
  documentType?: string;
  condicionIva?: string;
  address?: string;
  city?: string;
}

export interface OtherTaxDetail {
  description: string; // e.g. "Per.IB Salta SALTA", "Imp. Internos"
  baseAmount: number;
  rate: number;
  amount: number;
}

export interface DocumentData {
  documentType: 'factura' | 'nota_credito' | 'nota_debito' | 'remito' | 'presupuesto' | 'ticket';
  documentLetter: 'A' | 'B' | 'C' | 'E' | 'T' | 'X';
  documentCode?: string;
  documentNumber: string;
  pointOfSale: number;
  date: Date;
  dueDate?: Date;
  items: DocumentItem[];
  subtotal: number;
  ivaTotal?: number;
  ivaBreakdown?: { rate: number; base: number; amount: number }[];
  otherTaxes?: number;
  otherTaxesDetail?: OtherTaxDetail[];
  netoGravado?: number;
  netoNoGravado?: number;
  exento?: number;
  discount?: number;
  total: number;
  cae?: string;
  caeExpiration?: string;
  paymentMethod?: string;
  paymentCondition?: string;
  cashReceived?: number;
  change?: number;
  observations?: string;
  concept?: number;
  serviceStartDate?: string;
  serviceEndDate?: string;
  currency?: string;
  currencyRate?: number;
  remitoItems?: { name: string; quantity: number; unit?: string }[];
  transportInfo?: string;
  legalText?: string;
  template?: 'estandar' | 'profesional';
  printFormat?: 'a4' | 'ticket';
}

interface PrintDocumentProps {
  company: DocumentCompany;
  customer?: DocumentCustomer;
  document: DocumentData;
  onClose: () => void;
}

// ============ CONSTANTS ============
const CONDICION_IVA_LABELS: Record<string, string> = {
  'responsable_inscripto': 'IVA Responsable Inscripto',
  'monotributista': 'Responsable Monotributo',
  'monotributo': 'Responsable Monotributo',
  'exento': 'IVA Sujeto Exento',
  'consumidor_final': 'Consumidor Final',
  'no_responsable': 'No Responsable',
  'iva_responsable_inscripto': 'IVA Responsable Inscripto',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'factura': 'FACTURA',
  'nota_credito': 'NOTA DE CRÉDITO',
  'nota_debito': 'NOTA DE DÉBITO',
  'remito': 'REMITO',
  'presupuesto': 'PRESUPUESTO',
  'ticket': 'TICKET',
};

function DocumentWatermark({ opacity = 0.055, size = '68pt' }: { opacity?: number; size?: string }) {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-35deg)',
          fontSize: size,
          fontWeight: 800,
          color: '#94a3b8',
          opacity,
          letterSpacing: '12px',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        } as React.CSSProperties}
      >
        EMITIA
      </div>
    </div>
  );
}

function DocPageShell({
  children,
  style,
  watermarkSize,
  watermarkOpacity,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  watermarkSize?: string;
  watermarkOpacity?: number;
}) {
  return (
    <div
      className="doc-page"
      style={{
        position: 'relative',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        height: '100%',
        ...style,
      }}
    >
      <DocumentWatermark size={watermarkSize} opacity={watermarkOpacity} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100%' }}>
        {children}
      </div>
    </div>
  );
}

const CONCEPT_LABELS: Record<number, string> = {
  1: 'Productos',
  2: 'Servicios',
  3: 'Productos y Servicios',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'efectivo': 'Efectivo',
  'transferencia': 'Transferencia Bancaria',
  'tarjeta_credito': 'Tarjeta de Crédito',
  'tarjeta_debito': 'Tarjeta de Débito',
  'cheque': 'Cheque',
  'mercadopago': 'MercadoPago',
  'cuenta_corriente': 'Cuenta Corriente',
  'cash': 'Efectivo',
  'credit_card': 'Tarjeta de Crédito',
  'debit_card': 'Tarjeta de Débito',
  'transfer': 'Transferencia Bancaria',
};

// ============ COMPONENT ============
export function PrintDocument({ company, customer, document: doc, onClose }: PrintDocumentProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTemplate, setActiveTemplate] = useState<'estandar' | 'profesional'>(doc.template || 'profesional');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: doc.currency || 'ARS', minimumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCustomerDocument = (c?: DocumentCustomer) => {
    if (!c) return '-';
    if (c.cuit) return formatCUIT(c.cuit);
    const raw = (c.document || '').trim();
    if (!raw) return '-';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11) return formatCUIT(digits);
    return raw;
  };

  const displayItems: DocumentItem[] =
    doc.items.length > 0
      ? doc.items
      : [
          {
            name: 'Operación comercial — resumen',
            quantity: 1,
            unitPrice: doc.subtotal || doc.total || 0,
            subtotal: doc.subtotal || doc.total || 0,
            unit: 'UNIDAD',
            ivaRate: doc.documentLetter === 'A' ? 21 : 21,
            ivaAmount: doc.ivaTotal || 0,
          },
        ];

  const formatCUIT = (cuit?: string) => {
    if (!cuit) return '-';
    const clean = cuit.replace(/\D/g, '');
    if (clean.length === 11) return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
    return cuit;
  };

  const isTicketFormat = doc.printFormat === 'ticket' || (doc.printFormat !== 'a4' && doc.documentType === 'ticket');
  const isInvoice = ['factura', 'nota_credito', 'nota_debito'].includes(doc.documentType);
  const hasCAE = !!doc.cae && doc.cae !== '';
  const docTitle = DOCUMENT_TYPE_LABELS[doc.documentType] || 'COMPROBANTE';
  const condIvaEmisor = CONDICION_IVA_LABELS[company.condicionIva || 'responsable_inscripto'] || company.condicionIva || '';
  const condIvaReceptor = customer?.condicionIva ? (CONDICION_IVA_LABELS[customer.condicionIva] || customer.condicionIva) : 'Consumidor Final';
  const formattedPOS = String(doc.pointOfSale || 1).padStart(4, '0');
  const paymentLabel = doc.paymentMethod ? (PAYMENT_METHOD_LABELS[doc.paymentMethod] || doc.paymentMethod) : null;

  const getQRUrl = () => {
    if (!hasCAE || !company.cuit || !doc.cae) return null;
    const payload = buildFiscalQrPayload({
      date: doc.date,
      cuit: company.cuit,
      pointOfSale: doc.pointOfSale,
      documentCode: doc.documentCode || '0',
      documentNumber: doc.documentNumber,
      total: doc.total,
      currency: doc.currency,
      currencyRate: doc.currencyRate,
      customerCuit: customer?.cuit,
      customerDocument: customer?.document,
      cae: doc.cae,
    });
    return buildFiscalQrUrl(payload);
  };

  const AFIP_LEGAL_FOOTER =
    'Comprobante autorizado por ARCA. Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación.';

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    const pageSize = isTicketFormat ? '80mm auto' : 'A4';
    const bodyWidth = isTicketFormat ? '80mm' : '210mm';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docTitle} ${doc.documentLetter} ${doc.documentNumber}</title>
        <style>
          @page { size: ${pageSize}; margin: ${isTicketFormat ? '0' : '8mm 10mm'}; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: ${isTicketFormat ? "'Courier New', monospace" : "'Helvetica Neue', 'Arial', 'Helvetica', sans-serif"}; 
            font-size: ${isTicketFormat ? '11px' : '9pt'}; 
            line-height: 1.4; 
            padding: ${isTicketFormat ? '5px' : '0'};
            width: ${bodyWidth};
            max-width: ${bodyWidth};
            color: #1a1a1a;
            -webkit-font-smoothing: antialiased;
          }
          ${!isTicketFormat ? `
          html, body { height: 100%; }
          .doc-page { 
            display: flex; 
            flex-direction: column; 
            min-height: 100%; 
            height: 100%;
          }
          .doc-items-section { flex: 1; }
          .doc-items-section table { height: 100%; }
          ` : ''}
          @media print { 
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            ${!isTicketFormat ? `
            .doc-page { min-height: 100vh; height: 100vh; position: relative; }
            [aria-hidden] { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            ` : ''}
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const qrUrl = getQRUrl();
  const qrImageUrl = qrUrl ? buildFiscalQrImageUrl(qrUrl, isTicketFormat ? 100 : 120) : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {docTitle} {doc.documentLetter !== 'X' ? doc.documentLetter : ''}
            </h2>
            <p className="text-sm text-gray-500">Nº {doc.documentNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-200">
          <div ref={printRef} className="bg-white mx-auto shadow-xl" style={{
            width: isTicketFormat ? '302px' : '210mm',
            minHeight: isTicketFormat ? 'auto' : '297mm',
            height: isTicketFormat ? 'auto' : '297mm',
            fontFamily: isTicketFormat ? 'Courier New, monospace' : "'Helvetica Neue', Arial, Helvetica, sans-serif",
            fontSize: isTicketFormat ? '11px' : '9pt',
            color: '#1a1a1a',
          }}>
            {isTicketFormat ? renderTicketFormat() : (activeTemplate === 'profesional' ? renderA4Profesional() : renderA4Format())}
          </div>
        </div>

        {/* Template Selector */}
        {!isTicketFormat && (
          <div className="px-6 py-3 border-t bg-gray-50 flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Plantilla:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTemplate('estandar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTemplate === 'estandar' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}
              >
                <Layout className="w-3.5 h-3.5" /> Alternativa
              </button>
              <button
                onClick={() => setActiveTemplate('profesional')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTemplate === 'profesional' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}
              >
                <FileText className="w-3.5 h-3.5" /> ARCA
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t bg-gradient-to-r from-gray-50 to-white flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium text-gray-700">Cerrar</button>
          <button onClick={handlePrint} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-semibold shadow-md">
            <Printer className="w-5 h-5" /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>
    </div>
  );

  // ============ A4 FORMAT ============
  function renderA4Format() {
    const showIVADetail = doc.documentLetter === 'A';
    const isRetentionDoc = ['051', '052', '053'].includes(doc.documentCode || '');
    const fullAddress = [company.address, company.city, company.province].filter(Boolean).join(' - ');
    const customerFullAddress = [customer?.address, customer?.city].filter(Boolean).join(', ');

    return (
      <DocPageShell>
        {/* ═══════ HEADER ═══════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 1fr', borderBottom: '3px solid #1a1a1a' }}>
          {/* LEFT — Company */}
          <div style={{ padding: '16px 20px', borderRight: '3px solid #1a1a1a' }}>
            {company.logo && (
              <div style={{ marginBottom: '8px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={company.logo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '180px', objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ fontSize: '15pt', fontWeight: '800', letterSpacing: '-0.3px', lineHeight: 1.15, color: '#0f172a' }}>
              {company.legalName || company.businessName || 'Mi Negocio'}
            </div>
            {company.legalName && company.businessName && company.legalName !== company.businessName && (
              <div style={{ fontSize: '9pt', color: '#475569', marginTop: '2px', fontStyle: 'italic' }}>
                {company.businessName}
              </div>
            )}

            <div style={{ fontSize: '7.5pt', color: '#334155', lineHeight: 1.7, marginTop: '8px' }}>
              {fullAddress && <div>{fullAddress}</div>}
              {company.phone && <div>Tel: {company.phone}</div>}
              {company.email && <div>{company.email}</div>}
              {company.website && <div>{company.website}</div>}
            </div>
          </div>

          {/* CENTER — Letter */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRight: '3px solid #1a1a1a', background: '#f8fafc' }}>
            <div style={{ fontSize: '38pt', fontWeight: '900', lineHeight: 1, color: '#0f172a' }}>{doc.documentLetter}</div>
            {doc.documentCode && (
              <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '3px', fontWeight: '600' }}>COD. {doc.documentCode}</div>
            )}
            {isRetentionDoc && (
              <div style={{ fontSize: '5.5pt', color: '#1a1a1a', marginTop: '2px', fontWeight: '600', textAlign: 'center', lineHeight: 1.2, textTransform: 'uppercase' }}>Operación{'\n'}Sujeta a{'\n'}Retención</div>
            )}
          </div>

          {/* RIGHT — Document info */}
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '11pt', fontWeight: '800', color: '#0f172a', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{docTitle}</div>
            <div style={{ fontSize: '12pt', fontWeight: '800', margin: '5px 0', color: '#0f172a' }}>Nº {doc.documentNumber}</div>

            <div style={{ fontSize: '7.5pt', color: '#334155', lineHeight: 1.7, marginTop: '8px' }}>
              <div><span style={{ fontWeight: '700', color: '#1e293b' }}>Fecha de Emisión:</span> {formatDate(doc.date)}</div>
              {doc.dueDate && <div><span style={{ fontWeight: '700', color: '#1e293b' }}>Vto. de Pago:</span> {formatDate(doc.dueDate)}</div>}
              <div style={{ marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                <div><span style={{ fontWeight: '700', color: '#1e293b' }}>CUIT:</span> {formatCUIT(company.cuit)}</div>
                <div><span style={{ fontWeight: '700', color: '#1e293b' }}>IIBB:</span> {company.iibb || '-'}</div>
                <div><span style={{ fontWeight: '700', color: '#1e293b' }}>Inicio Act.:</span> {company.fechaInicioActividad ? formatDate(company.fechaInicioActividad) : '-'}</div>
                <div><span style={{ fontWeight: '700', color: '#1e293b' }}>Cond. IVA:</span> {condIvaEmisor}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ CUSTOMER ═══════ */}
        {customer && (
          <div style={{ borderBottom: '2px solid #1a1a1a', background: '#f8fafc' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '8pt' }}>
              <div style={{ padding: '10px 20px', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', color: '#1e293b', minWidth: '90px' }}>Razón Social:</span>
                  <span style={{ fontWeight: '600' }}>{customer.name || 'Consumidor Final'}</span>
                </div>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', color: '#1e293b', minWidth: '90px' }}>CUIT / DNI:</span>
                  <span>{customer.cuit ? formatCUIT(customer.cuit) : formatCustomerDocument(customer)}</span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ fontWeight: '700', color: '#1e293b', minWidth: '90px' }}>Domicilio:</span>
                  <span>{customerFullAddress || '-'}</span>
                </div>
              </div>
              <div style={{ padding: '10px 20px' }}>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', color: '#1e293b', minWidth: '90px' }}>Cond. IVA:</span>
                  <span style={{ fontWeight: '600' }}>{condIvaReceptor}</span>
                </div>
                {paymentLabel && (
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', color: '#1e293b', minWidth: '90px' }}>Forma de Pago:</span>
                    <span>{paymentLabel}</span>
                  </div>
                )}
                {doc.paymentCondition && (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <span style={{ fontWeight: '700', color: '#1e293b', minWidth: '90px' }}>Cond. Venta:</span>
                    <span>{doc.paymentCondition}</span>
                  </div>
                )}
                {doc.concept && (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <span style={{ fontWeight: '700', color: '#1e293b', minWidth: '90px' }}>Concepto:</span>
                    <span>{CONCEPT_LABELS[doc.concept] || '-'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Retention Legend for COD 51/52/53 */}
        {isRetentionDoc && (
          <div style={{ padding: '6px 20px', borderBottom: '2px solid #1a1a1a', fontSize: '8pt', fontWeight: '700', color: '#1a1a1a', background: '#f8fafc', textAlign: 'center', letterSpacing: '0.3px' }}>
            OPERACIÓN SUJETA A RETENCIÓN
          </div>
        )}

        {/* Service period */}
        {(doc.concept === 2 || doc.concept === 3) && (doc.serviceStartDate || doc.serviceEndDate) && (
          <div style={{ padding: '6px 20px', borderBottom: '1px solid #e2e8f0', fontSize: '7.5pt', background: '#fffbeb', color: '#92400e' }}>
            <span style={{ fontWeight: '700' }}>Período del servicio: </span>
            {doc.serviceStartDate && `Desde ${formatDate(doc.serviceStartDate)}`}
            {doc.serviceEndDate && ` hasta ${formatDate(doc.serviceEndDate)}`}
            {doc.dueDate && ` — Vto. pago: ${formatDate(doc.dueDate)}`}
          </div>
        )}

        {/* ═══════ ITEMS TABLE ═══════ */}
        <div className="doc-items-section" style={{ flex: 1 }}>
          {doc.documentType === 'remito' ? renderRemitoItems() : renderInvoiceItems()}
        </div>

        {/* ═══════ TOTALS ═══════ */}
        {doc.documentType !== 'remito' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '3px solid #1a1a1a' }}>
            <div style={{ width: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '8.5pt', color: '#475569' }}>
                <span>Subtotal:</span><span style={{ fontWeight: '600' }}>{formatCurrency(doc.subtotal)}</span>
              </div>
              {doc.discount != null && doc.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '8.5pt', color: '#dc2626' }}>
                  <span>Descuento:</span><span style={{ fontWeight: '600' }}>-{formatCurrency(doc.discount)}</span>
                </div>
              )}
              {/* IVA breakdown A */}
              {showIVADetail && doc.ivaBreakdown && doc.ivaBreakdown.length > 0 && (
                doc.ivaBreakdown.map((iva, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '7.5pt', color: '#64748b' }}>
                    <span>IVA {iva.rate}% (s/ {formatCurrency(iva.base)})</span><span>{formatCurrency(iva.amount)}</span>
                  </div>
                ))
              )}
              {showIVADetail && doc.ivaTotal != null && doc.ivaTotal > 0 && !(doc.ivaBreakdown?.length) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '8.5pt', color: '#475569' }}>
                  <span>IVA 21%:</span><span style={{ fontWeight: '600' }}>{formatCurrency(doc.ivaTotal)}</span>
                </div>
              )}
              {/* IVA total for B/C (already included) */}
              {!showIVADetail && doc.ivaTotal != null && doc.ivaTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '7.5pt', color: '#94a3b8', fontStyle: 'italic' }}>
                  <span>IVA incluido:</span><span>{formatCurrency(doc.ivaTotal)}</span>
                </div>
              )}
              {doc.otherTaxes != null && doc.otherTaxes > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '8.5pt', color: '#475569' }}>
                  <span>Otros Tributos:</span><span style={{ fontWeight: '600' }}>{formatCurrency(doc.otherTaxes)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14pt', fontWeight: '900', borderTop: '3px solid #1a1a1a', paddingTop: '8px', marginTop: '6px', color: '#0f172a' }}>
                <span>TOTAL</span><span>{formatCurrency(doc.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ OBSERVATIONS ═══════ */}
        {doc.observations && (
          <div style={{ padding: '8px 20px', fontSize: '7.5pt', borderTop: '1px solid #e2e8f0', color: '#64748b' }}>
            <span style={{ fontWeight: '700', color: '#475569' }}>Observaciones: </span>{doc.observations}
          </div>
        )}

        {/* ═══════ FOOTER — CAE / QR ═══════ */}
        <div style={{ borderTop: '2px solid #1a1a1a', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            {qrImageUrl && (
              <div style={{ width: '110px', height: '110px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl} alt="QR AFIP" style={{ width: '100%', height: '100%' }} />
              </div>
            )}
            {!qrImageUrl && isInvoice && doc.documentType !== 'presupuesto' && (
              <div style={{ width: '90px', height: '90px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7pt', color: '#94a3b8', textAlign: 'center', borderRadius: '4px' }}>
                QR AFIP<br/>Pendiente
              </div>
            )}
            {hasCAE && (
              <div style={{ fontSize: '7.5pt', color: '#475569' }}>
                <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '2px' }}>Comprobante Autorizado</div>
                <div>CAE Nº: <span style={{ fontWeight: '700' }}>{doc.cae}</span></div>
                <div>Fecha Vto. CAE: <span style={{ fontWeight: '700' }}>{doc.caeExpiration ? formatAfipCalendarDate(doc.caeExpiration) : '-'}</span></div>
                <div style={{ marginTop: '4px', fontSize: '6.5pt', color: '#64748b', maxWidth: '280px' }}>{AFIP_LEGAL_FOOTER}</div>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: '7.5pt' }}>
            {!hasCAE && doc.documentType === 'presupuesto' && (
              <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '8pt' }}>Documento no fiscal — Válido como presupuesto</div>
            )}
            {!hasCAE && doc.documentType === 'remito' && (
              <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '8pt' }}>Documento no fiscal — Remito</div>
            )}
            {!hasCAE && isInvoice && (
              <div style={{ color: '#94a3b8', fontSize: '7.5pt' }}>CAE pendiente de autorización</div>
            )}
          </div>
        </div>

        {/* ═══════ BRANDING FOOTER ═══════ */}
        <div style={{ textAlign: 'center', padding: '6px 20px', fontSize: '6.5pt', color: '#94a3b8', borderTop: '1px solid #f1f5f9', background: '#fafafa', letterSpacing: '0.5px' }}>
          Comprobante emitido con <span style={{ fontWeight: '700' }}>EMITIA</span> — Sistema de Gestión y Facturación Electrónica — emitia.com.ar
        </div>
      </DocPageShell>
    );
  }

  // ============ INVOICE ITEMS TABLE ============
  function renderInvoiceItems() {
    const showIVA = doc.documentLetter === 'A';
    return (
      <div style={{ height: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', height: '100%' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#fff' }}>
              <th style={{ padding: '7px 12px', textAlign: 'center', fontWeight: '700', width: '40px', fontSize: '7pt' }}>CÓD.</th>
              <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: '700' }}>PRODUCTO / SERVICIO</th>
              <th style={{ padding: '7px 12px', textAlign: 'center', fontWeight: '700', width: '50px' }}>CANT.</th>
              <th style={{ padding: '7px 12px', textAlign: 'right', fontWeight: '700', width: '80px' }}>P. UNIT.</th>
              {showIVA && <th style={{ padding: '7px 12px', textAlign: 'center', fontWeight: '700', width: '50px' }}>IVA %</th>}
              {showIVA && <th style={{ padding: '7px 12px', textAlign: 'right', fontWeight: '700', width: '75px' }}>IVA</th>}
              <th style={{ padding: '7px 12px', textAlign: 'right', fontWeight: '700', width: '90px' }}>SUBTOTAL</th>
            </tr>
          </thead>
          <tbody style={{ verticalAlign: 'top' }}>
            {displayItems.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '6px 12px', fontSize: '7pt', color: '#64748b', textAlign: 'center' }}>{String(i + 1).padStart(3, '0')}</td>
                <td style={{ padding: '6px 12px' }}>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.name}</div>
                  {item.description && item.description !== item.name && <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '1px' }}>{item.description}</div>}
                  {item.discount != null && item.discount > 0 && <div style={{ fontSize: '7pt', color: '#dc2626', marginTop: '1px' }}>Desc. {item.discount}%</div>}
                </td>
                <td style={{ padding: '6px 12px', textAlign: 'center', color: '#334155' }}>{item.quantity}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#334155' }}>{formatCurrency(item.unitPrice)}</td>
                {showIVA && <td style={{ padding: '6px 12px', textAlign: 'center', color: '#64748b' }}>{item.ivaRate ?? 21}%</td>}
                {showIVA && <td style={{ padding: '6px 12px', textAlign: 'right', color: '#64748b' }}>{formatCurrency(item.ivaAmount ?? (item.subtotal * (item.ivaRate ?? 21) / 100))}</td>}
                <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
            {/* Empty filler row to push content to bottom of page */}
            <tr style={{ height: '100%' }}>
              <td colSpan={showIVA ? 7 : 5} style={{ borderBottom: 'none' }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // ============ A4 PROFESIONAL FORMAT (CRONEC-style) ============
  function renderA4Profesional() {
    const showIVADetail = doc.documentLetter === 'A';
    const isRetentionDoc = ['051', '052', '053'].includes(doc.documentCode || '');
    const fullAddress = [company.address, company.city, company.province].filter(Boolean).join(' ');
    const customerFullAddress = [customer?.address, customer?.city].filter(Boolean).join(' - ');

    // Calculate neto gravado from items if not provided
    const netoGravado = doc.netoGravado ?? doc.subtotal;
    const otherTaxesTotal = doc.otherTaxes ?? (doc.otherTaxesDetail?.reduce((s, t) => s + t.amount, 0) || 0);

    // Compute IVA breakdown by rate for ARCA bottom section
    const ivaRates = [2.5, 5, 10.5, 21, 27];
    const ivaByRate: Record<number, { neto: number; iva: number }> = {};
    ivaRates.forEach(r => { ivaByRate[r] = { neto: 0, iva: 0 }; });
    if (doc.ivaBreakdown && doc.ivaBreakdown.length > 0) {
      doc.ivaBreakdown.forEach(b => {
        if (ivaByRate[b.rate] !== undefined) {
          ivaByRate[b.rate].neto += b.base;
          ivaByRate[b.rate].iva += b.amount;
        }
      });
    } else if (showIVADetail) {
      // Default to 21% from totals
      ivaByRate[21] = { neto: netoGravado, iva: doc.ivaTotal || 0 };
    }
    const totalNeto = Object.values(ivaByRate).reduce((s, v) => s + v.neto, 0);
    const totalIva = Object.values(ivaByRate).reduce((s, v) => s + v.iva, 0);

    // Document number in ARCA format: A-00006-00000003
    const numParts = doc.documentNumber.split('-');
    const arcaNumero = `${doc.documentLetter}-${numParts.length >= 2 ? numParts.slice(-2).map((p, i) => i === 0 ? p.padStart(5, '0') : p.padStart(8, '0')).join('-') : doc.documentNumber}`;

    return (
      <DocPageShell>
        {/* ═══════ HEADER — ARCA Format ═══════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', borderBottom: '2px solid #000' }}>
          {/* LEFT — Company Logo + basic info */}
          <div style={{ padding: '14px 18px', borderRight: '2px solid #000' }}>
            {company.logo && (
              <div style={{ marginBottom: '8px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={company.logo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '200px', objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ fontSize: '8.5pt', color: '#000', lineHeight: 1.7, marginTop: '4px' }}>
              <div><span style={{ fontWeight: '700' }}>Razón Social:</span> {company.legalName || company.businessName || 'Mi Negocio'}</div>
              <div><span style={{ fontWeight: '700' }}>Domicilio:</span> {fullAddress || '-'}</div>
              <div style={{ marginTop: '2px' }}><span style={{ fontWeight: '700' }}>Condición frente al IVA:</span> {condIvaEmisor}</div>
            </div>
          </div>

          {/* CENTER — Letter */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRight: '2px solid #000' }}>
            <div style={{ fontSize: '42pt', fontWeight: '900', lineHeight: 1, color: '#000' }}>{doc.documentLetter}</div>
            {doc.documentCode && (
              <div style={{ fontSize: '7pt', color: '#555', marginTop: '3px', fontWeight: '600', border: '1px solid #999', padding: '1px 4px', borderRadius: '2px' }}>{doc.documentCode}</div>
            )}
            {isRetentionDoc && (
              <div style={{ fontSize: '5.5pt', color: '#000', marginTop: '2px', fontWeight: '700', textAlign: 'center', lineHeight: 1.2, textTransform: 'uppercase' }}>Sujeta a{'\n'}Retención</div>
            )}
          </div>

          {/* RIGHT — Document info (ARCA style) */}
          <div style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '12pt', fontWeight: '800', color: '#000', marginBottom: '6px' }}>{docTitle}</div>
            <div style={{ fontSize: '8.5pt', color: '#000', lineHeight: 1.7 }}>
              <div><span style={{ fontWeight: '700' }}>Numero:</span> {arcaNumero}</div>
              <div><span style={{ fontWeight: '700' }}>Fecha:</span> {formatDate(doc.date)}</div>
              <div><span style={{ fontWeight: '700' }}>CUIT:</span> {formatCUIT(company.cuit)}</div>
              <div><span style={{ fontWeight: '700' }}>Ing. Brutos:</span> {company.iibb || '-'}</div>
              <div><span style={{ fontWeight: '700' }}>Inicio Act.:</span> {company.fechaInicioActividad ? formatDate(company.fechaInicioActividad) : '-'}</div>
              <div><span style={{ fontWeight: '700' }}>Pto. Vta.:</span> {String(doc.pointOfSale).padStart(5, '0')}</div>
            </div>
          </div>
        </div>

        {/* ═══════ CUSTOMER — ARCA Format ═══════ */}
        {customer && (
          <div style={{ borderBottom: '2px solid #000', fontSize: '8.5pt', padding: '8px 18px', lineHeight: 1.7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><span style={{ fontWeight: '700' }}>Sr.(es):</span> {customer.name || 'Consumidor Final'}</span>
              <span><span style={{ fontWeight: '700' }}>CUIT:</span> {formatCustomerDocument(customer)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><span style={{ fontWeight: '700' }}>Domicilio:</span> {customerFullAddress || '-'}</span>
              <span><span style={{ fontWeight: '700' }}>Cond. IVA:</span> {condIvaReceptor}</span>
            </div>
            <div style={{ marginTop: '4px', borderTop: '1px solid #ccc', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span><span style={{ fontWeight: '700' }}>Moneda:</span> {doc.currency || 'ARS'}</span>
              {doc.dueDate && <span><span style={{ fontWeight: '700' }}>Fecha Vto:</span> {formatDate(doc.dueDate)}</span>}
              {paymentLabel && <span><span style={{ fontWeight: '700' }}>Forma de pago:</span> {paymentLabel}</span>}
              {doc.paymentCondition && <span><span style={{ fontWeight: '700' }}>Cond. de Venta:</span> {doc.paymentCondition}</span>}
            </div>
          </div>
        )}

        {/* Retention Legend */}
        {isRetentionDoc && (
          <div style={{ padding: '5px 18px', borderBottom: '2px solid #000', fontSize: '8pt', fontWeight: '700', color: '#000', textAlign: 'center', letterSpacing: '0.3px' }}>
            OPERACIÓN SUJETA A RETENCIÓN
          </div>
        )}

        {/* Service period */}
        {(doc.concept === 2 || doc.concept === 3) && (doc.serviceStartDate || doc.serviceEndDate) && (
          <div style={{ padding: '5px 18px', borderBottom: '1px solid #ccc', fontSize: '7.5pt', color: '#000' }}>
            <span style={{ fontWeight: '700' }}>Período del servicio: </span>
            {doc.serviceStartDate && `Desde ${formatDate(doc.serviceStartDate)}`}
            {doc.serviceEndDate && ` hasta ${formatDate(doc.serviceEndDate)}`}
          </div>
        )}

        {/* ═══════ ITEMS TABLE — ARCA Format ═══════ */}
        <div className="doc-items-section" style={{ flex: 1 }}>
          {doc.documentType === 'remito' ? renderRemitoItems() : renderInvoiceItemsProfesional()}
        </div>

        {/* ═══════ OBSERVATIONS ═══════ */}
        {doc.observations && (
          <div style={{ padding: '6px 18px', fontSize: '7.5pt', borderTop: '1px solid #000', color: '#000' }}>
            <span style={{ fontWeight: '700' }}>Observaciones: </span>{doc.observations}
          </div>
        )}

        {/* ═══════ ARCA IVA BREAKDOWN — Bottom Grid ═══════ */}
        {doc.documentType !== 'remito' && showIVADetail && (
          <div style={{ borderTop: '2px solid #000', fontSize: '7.5pt' }}>
            {/* Row 1: Neto labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid #ccc' }}>
              {ivaRates.map(rate => (
                <div key={`neto-${rate}`} style={{ padding: '4px 8px', borderRight: '1px solid #ccc' }}>
                  <span style={{ fontWeight: '700' }}>Neto {rate}%:</span> {formatCurrency(ivaByRate[rate].neto)}
                </div>
              ))}
            </div>
            {/* Row 2: IVA amounts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid #ccc' }}>
              {ivaRates.map(rate => (
                <div key={`iva-${rate}`} style={{ padding: '4px 8px', borderRight: '1px solid #ccc' }}>
                  <span style={{ fontWeight: '700' }}>IVA:</span> {formatCurrency(ivaByRate[rate].iva)}
                </div>
              ))}
            </div>
            {/* Row 3: Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: '2px solid #000' }}>
              <div style={{ padding: '6px 8px', fontWeight: '700', borderRight: '1px solid #ccc' }}>Total Neto: {formatCurrency(totalNeto || netoGravado)}</div>
              <div style={{ padding: '6px 8px', fontWeight: '700', borderRight: '1px solid #ccc' }}>Total IVA: {formatCurrency(totalIva || doc.ivaTotal || 0)}</div>
              <div style={{ padding: '6px 8px', fontWeight: '700', borderRight: '1px solid #ccc' }}>Imp y Percep: {formatCurrency(otherTaxesTotal)}</div>
              <div style={{ padding: '6px 8px', fontWeight: '900', fontSize: '9pt' }}>Total: {formatCurrency(doc.total)}</div>
            </div>
          </div>
        )}

        {/* Factura B/C: simpler totals */}
        {doc.documentType !== 'remito' && !showIVADetail && (
          <div style={{ borderTop: '2px solid #000', padding: '8px 18px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '250px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '8pt' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(doc.subtotal)}</span>
              </div>
              {doc.discount != null && doc.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '8pt', color: '#c00' }}>
                  <span>Descuento:</span>
                  <span>-{formatCurrency(doc.discount)}</span>
                </div>
              )}
              {otherTaxesTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '8pt' }}>
                  <span>Otros Tributos:</span>
                  <span>{formatCurrency(otherTaxesTotal)}</span>
                </div>
              )}
              {doc.ivaTotal != null && doc.ivaTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '7.5pt', color: '#666', fontStyle: 'italic' }}>
                  <span>IVA incluido:</span>
                  <span>{formatCurrency(doc.ivaTotal)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12pt', fontWeight: '900', borderTop: '2px solid #000', paddingTop: '6px', marginTop: '4px', color: '#000' }}>
                <span>Total:</span>
                <span>{formatCurrency(doc.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ FOOTER — ARCA CAE / QR ═══════ */}
        <div style={{ borderTop: '2px solid #000', padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {qrImageUrl && (
              <div style={{ width: '100px', height: '100px', border: '1px solid #ccc', overflow: 'hidden', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl} alt="QR AFIP" style={{ width: '100%', height: '100%' }} />
              </div>
            )}
            {!qrImageUrl && isInvoice && (
              <div style={{ width: '80px', height: '80px', border: '1px dashed #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7pt', color: '#999', textAlign: 'center' }}>
                QR AFIP<br/>Pendiente
              </div>
            )}
            <div style={{ fontSize: '8pt', color: '#000' }}>
              {hasCAE && (
                <>
                  <div style={{ fontWeight: '900', marginBottom: '4px', fontSize: '11pt', letterSpacing: '1px' }}>
                    ARCA
                    <div style={{ fontSize: '5pt', fontWeight: '600', letterSpacing: '0', color: '#444', lineHeight: 1.2 }}>AGENCIA DE RECAUDACIÓN<br/>Y CONTROL ADUANERO</div>
                  </div>
                  <div style={{ marginBottom: '2px' }}><span style={{ fontWeight: '700' }}>CAE:</span> {doc.cae}</div>
                  <div style={{ marginBottom: '4px' }}><span style={{ fontWeight: '700' }}>Fecha Vto. CAE:</span> {doc.caeExpiration ? formatAfipCalendarDate(doc.caeExpiration) : '-'}</div>
                  <div style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '7.5pt' }}>Comprobante Autorizado</div>
                </>
              )}
              {!hasCAE && isInvoice && (
                <div style={{ color: '#999', fontSize: '7.5pt' }}>CAE pendiente de autorización</div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '7pt', color: '#666' }}>
            <div>Página 1 de 1</div>
          </div>
        </div>

        {/* ═══════ BRANDING FOOTER ═══════ */}
        <div style={{ textAlign: 'center', padding: '6px 18px', fontSize: '6.5pt', color: '#94a3b8', borderTop: '1px solid #f1f5f9', background: '#fafafa', letterSpacing: '0.5px' }}>
          Comprobante emitido con <span style={{ fontWeight: '700' }}>EMITIA</span> — Sistema de Gestión y Facturación Electrónica — emitia.com.ar
        </div>

        {/* ═══════ DISCLAIMER — ARCA ═══════ */}
        <div style={{ textAlign: 'center', padding: '4px 18px', fontSize: '6pt', color: '#666', borderTop: '1px solid #ccc' }}>
          Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación
        </div>
      </DocPageShell>
    );
  }

  // ============ PROFESIONAL ITEMS TABLE (ARCA Format) ============
  function renderInvoiceItemsProfesional() {
    const showIVA = doc.documentLetter === 'A';
    const colCount = showIVA ? 9 : 6;
    return (
      <div style={{ height: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt', height: '100%' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #000' }}>
              <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: '700', width: '40px', borderRight: '1px solid #ccc' }}>Cód.</th>
              <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: '700', borderRight: '1px solid #ccc' }}>Artículo</th>
              <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: '700', width: '55px', borderRight: '1px solid #ccc' }}>Cantidad</th>
              <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: '700', width: '60px', borderRight: '1px solid #ccc' }}>U. Medida</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '700', width: '70px', borderRight: '1px solid #ccc' }}>Precio Unit.</th>
              {showIVA && <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '700', width: '65px', borderRight: '1px solid #ccc' }}>Subtotal</th>}
              {showIVA && <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: '700', width: '40px', borderRight: '1px solid #ccc' }}>% IVA</th>}
              {showIVA && <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '700', width: '55px', borderRight: '1px solid #ccc' }}>IVA</th>}
              <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '700', width: '70px' }}>Total</th>
            </tr>
          </thead>
          <tbody style={{ verticalAlign: 'top' }}>
            {displayItems.map((item, i) => {
              const qty = item.quantity || 1;
              const unitP = item.unitPrice || 0;
              const disc = item.discount || 0;
              const lineSubtotal = item.subtotal || (qty * unitP * (1 - disc / 100));
              const ivaRate = item.ivaRate ?? 21;
              const ivaAmt = showIVA ? lineSubtotal * (ivaRate / 100) : 0;
              const lineTotal = showIVA ? lineSubtotal + ivaAmt : lineSubtotal;
              return (
                <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '4px 6px', color: '#666', fontSize: '6.5pt' }}>{item.code || ''}</td>
                  <td style={{ padding: '4px 6px', color: '#000' }}>
                    {item.name}
                    {disc > 0 && <span style={{ fontSize: '6.5pt', color: '#c00', marginLeft: '4px' }}>(-{disc}%)</span>}
                  </td>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>{qty.toFixed(2)}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center', fontSize: '6.5pt' }}>{item.unit || 'UNIDAD'}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatCurrency(unitP)}</td>
                  {showIVA && <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatCurrency(lineSubtotal)}</td>}
                  {showIVA && <td style={{ padding: '4px 6px', textAlign: 'center' }}>{ivaRate.toFixed(2)}</td>}
                  {showIVA && <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatCurrency(ivaAmt)}</td>}
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(lineTotal)}</td>
                </tr>
              );
            })}
            {/* Empty filler */}
            <tr style={{ height: '100%' }}>
              <td colSpan={colCount} style={{ borderBottom: 'none' }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // ============ REMITO ITEMS TABLE ============
  function renderRemitoItems() {
    const items = doc.remitoItems || displayItems.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit || 'u' }));
    return (
      <div style={{ height: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#fff' }}>
              <th style={{ padding: '7px 12px', textAlign: 'center', fontWeight: '700', width: '40px' }}>Nº</th>
              <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: '700' }}>DESCRIPCIÓN</th>
              <th style={{ padding: '7px 12px', textAlign: 'center', fontWeight: '700', width: '80px' }}>CANTIDAD</th>
              <th style={{ padding: '7px 12px', textAlign: 'center', fontWeight: '700', width: '60px' }}>UNIDAD</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '6px 12px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ padding: '6px 12px', fontWeight: '600' }}>{item.name}</td>
                <td style={{ padding: '6px 12px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '6px 12px', textAlign: 'center' }}>{item.unit || 'u'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {doc.transportInfo && (
          <div style={{ padding: '8px 20px', fontSize: '7.5pt', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontWeight: '700' }}>Transporte: </span>{doc.transportInfo}
          </div>
        )}
      </div>
    );
  }

  // ============ TICKET FORMAT (80mm) ============
  function renderTicketFormat() {
    // If has CAE, it's a fiscal document — show the factura type instead of TIQUE
    const isFiscalTicket = hasCAE && isInvoice;
    const ticketDocLabel = isFiscalTicket
      ? `${DOCUMENT_TYPE_LABELS[doc.documentType] || 'FACTURA'} ${doc.documentLetter}`
      : 'TIQUE';
    const ticketDocSubLabel = isFiscalTicket
      ? 'Cod. ' + (doc.documentCode || '')
      : 'DOCUMENTO NO VÁLIDO COMO FACTURA';
    const showIVAInTicket = isFiscalTicket || (doc.ivaBreakdown && doc.ivaBreakdown.length > 0);
    const fullAddr = [company.address, company.city, company.province].filter(Boolean).join(', ');

    const formatDateTimeTk = (date: Date | string) => {
      const d = new Date(date);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    };

    const formatAmountTk = (amount: number) => {
      return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
      <DocPageShell style={{ height: 'auto', minHeight: 'auto' }} watermarkSize="28pt" watermarkOpacity={0.08}>
      <div style={{ padding: '8px 6px', lineHeight: 1.5 }}>
        {/* ═══════ HEADER — Company Info ═══════ */}
        <div style={{ textAlign: 'center', paddingBottom: '6px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '2px' }}>
            {(company.legalName || company.businessName || 'Mi Negocio').toUpperCase()}
          </div>
          {fullAddr && (
            <div style={{ fontSize: '10px', color: '#333' }}>{fullAddr.toUpperCase()}</div>
          )}
          {company.phone && (
            <div style={{ fontSize: '10px', color: '#333' }}>Tel: {company.phone}</div>
          )}
          {company.cuit && (
            <div style={{ fontSize: '10px', color: '#333' }}>CUIT: {formatCUIT(company.cuit)}</div>
          )}
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>
            {condIvaEmisor.toUpperCase()}
          </div>
        </div>

        {/* ═══════ DOCUMENT TYPE BADGE ═══════ */}
        <div style={{ textAlign: 'center', margin: '6px 0 8px 0' }}>
          <div style={{
            display: 'inline-block',
            background: '#1a1a1a',
            color: '#fff',
            padding: '3px 16px',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            borderRadius: '3px',
          }}>
            {ticketDocLabel}
          </div>
          <div style={{ fontSize: '7px', color: '#666', marginTop: '3px', fontWeight: 'bold' }}>
            {ticketDocSubLabel}
          </div>
        </div>

        {/* ═══════ DOCUMENT INFO ═══════ */}
        <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '6px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
            N°: {formattedPOS}-{doc.documentNumber.includes('-') ? doc.documentNumber.split('-').pop()?.padStart(8, '0') : doc.documentNumber.padStart(8, '0')}
          </div>
          <div>Fecha: {formatDateTimeTk(doc.date)}</div>
          <div>Punto de Venta: {formattedPOS}</div>
        </div>

        <div style={{ borderTop: '1px solid #000', margin: '6px 0' }} />

        {/* ═══════ CUSTOMER DATA ═══════ */}
        {customer && (customer.name || customer.document || customer.cuit) && (
          <>
            <div style={{ fontSize: '10px', marginBottom: '6px' }}>
              <div><span style={{ fontWeight: 'bold' }}>Cliente:</span> {customer.name || 'Consumidor Final'}</div>
              {customer.cuit && <div><span style={{ fontWeight: 'bold' }}>CUIT:</span> {formatCUIT(customer.cuit)}</div>}
              {!customer.cuit && customer.document && <div><span style={{ fontWeight: 'bold' }}>Doc:</span> {formatCustomerDocument(customer)}</div>}
              {customer.condicionIva && (
                <div><span style={{ fontWeight: 'bold' }}>Cond. IVA:</span> {CONDICION_IVA_LABELS[customer.condicionIva] || customer.condicionIva}</div>
              )}
              {customer.address && (
                <div><span style={{ fontWeight: 'bold' }}>Domicilio:</span> {[customer.address, customer.city].filter(Boolean).join(', ')}</div>
              )}
              {paymentLabel && (
                <div><span style={{ fontWeight: 'bold' }}>Cond. Pago:</span> {paymentLabel}</div>
              )}
            </div>
            <div style={{ borderTop: '1px solid #000', margin: '6px 0' }} />
          </>
        )}

        {/* ═══════ ITEMS TABLE ═══════ */}
        <div style={{ marginBottom: '4px' }}>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            borderBottom: '1px solid #000',
            paddingBottom: '3px',
            marginBottom: '4px',
          }}>
            <span>Descripción</span>
            <span style={{ textAlign: 'right', minWidth: '30px' }}>Cant</span>
            <span style={{ textAlign: 'right', minWidth: '70px' }}>P.U.</span>
            <span style={{ textAlign: 'right', minWidth: '70px' }}>Subtot.</span>
          </div>

          {/* Item rows */}
          {displayItems.map((item, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: '4px',
              fontSize: '10px',
              padding: '3px 0',
              borderBottom: i < displayItems.length - 1 ? '1px dotted #ccc' : 'none',
            }}>
              <span style={{ wordBreak: 'break-word' }}>{item.name}</span>
              <span style={{ textAlign: 'right', minWidth: '30px' }}>{item.quantity}</span>
              <span style={{ textAlign: 'right', minWidth: '70px', fontSize: '9px' }}>$ {formatAmountTk(item.unitPrice)}</span>
              <span style={{ textAlign: 'right', minWidth: '70px', fontSize: '9px' }}>$ {formatAmountTk(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #000', margin: '4px 0' }} />

        {/* ═══════ SUBTOTALS / IVA ═══════ */}
        {doc.discount != null && doc.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#d00', padding: '2px 0' }}>
            <span>Descuento:</span><span>-$ {formatAmountTk(doc.discount)}</span>
          </div>
        )}

        {showIVAInTicket && doc.netoGravado != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0' }}>
            <span>Neto Gravado:</span><span>$ {formatAmountTk(doc.netoGravado)}</span>
          </div>
        )}

        {showIVAInTicket && doc.ivaBreakdown && doc.ivaBreakdown.map((iva, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0' }}>
            <span>IVA {iva.rate}%:</span><span>$ {formatAmountTk(iva.amount)}</span>
          </div>
        ))}

        {showIVAInTicket && doc.ivaTotal != null && !doc.ivaBreakdown?.length && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0' }}>
            <span>IVA 21%:</span><span>$ {formatAmountTk(doc.ivaTotal)}</span>
          </div>
        )}

        {/* ═══════ TOTAL ═══════ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '15px',
          fontWeight: 'bold',
          padding: '6px 0 4px 0',
          borderTop: '2px solid #000',
          marginTop: '4px',
        }}>
          <span>TOTAL ARS:</span>
          <span>$ {formatAmountTk(doc.total)}</span>
        </div>

        {/* ═══════ PAYMENT INFO (only if no CAE / non-fiscal) ═══════ */}
        {!isFiscalTicket && doc.paymentMethod && (
          <div style={{ fontSize: '10px', padding: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Pago:</span><span>{paymentLabel || doc.paymentMethod}</span>
            </div>
            {doc.cashReceived != null && doc.cashReceived > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Recibido:</span><span>$ {formatAmountTk(doc.cashReceived)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}><span>Vuelto:</span><span>$ {formatAmountTk(doc.change || 0)}</span></div>
              </>
            )}
          </div>
        )}

        {/* ═══════ CAE + QR (FISCAL) ═══════ */}
        {hasCAE && (
          <>
            <div style={{ borderTop: '1px solid #000', margin: '6px 0' }} />
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '6px',
              border: '1px solid #333',
              borderRadius: '4px',
              margin: '4px 0',
            }}>
              {qrImageUrl && (
                <div style={{ flexShrink: 0, width: '70px', height: '70px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrImageUrl} alt="QR AFIP" style={{ width: '100%', height: '100%' }} />
                </div>
              )}
              <div style={{ fontSize: '9px', lineHeight: 1.6 }}>
                <div><span style={{ fontWeight: 'bold' }}>CAE:</span> {doc.cae}</div>
                {doc.caeExpiration && (
                  <div><span style={{ fontWeight: 'bold' }}>Venc. CAE:</span> {formatAfipCalendarDate(doc.caeExpiration)}</div>
                )}
                <div style={{ fontStyle: 'italic', color: '#555', marginTop: '2px' }}>ARCA - Comprobante Autorizado</div>
              </div>
            </div>
          </>
        )}

        {/* ═══════ OBSERVATIONS ═══════ */}
        {doc.observations && (
          <div style={{ fontSize: '9px', borderTop: '1px dashed #000', paddingTop: '4px', marginTop: '4px', color: '#666' }}>
            Obs: {doc.observations}
          </div>
        )}

        {/* ═══════ FOOTER ═══════ */}
        <div style={{ textAlign: 'center', fontSize: '9px', borderTop: '1px dashed #000', paddingTop: '8px', marginTop: '8px' }}>
          <div style={{ fontWeight: 'bold' }}>¡Gracias por su compra!</div>
          {company.website && (
            <div style={{ color: '#555', marginTop: '3px' }}>{company.website}</div>
          )}
          <div style={{ color: '#aaa', marginTop: '3px', fontSize: '7px' }}>EMITIA Sistema de Gestión</div>
        </div>
      </div>
      </DocPageShell>
    );
  }
}

export default PrintDocument;
