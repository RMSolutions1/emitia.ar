import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { buildInvoicePrintData } from '@/lib/invoice-print-data';
import { formatAfipCalendarDate } from '@/lib/afip/date-utils';
import { sendSystemEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

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
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(amount);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCUIT(cuit?: string) {
  if (!cuit) return '-';
  const clean = cuit.replace(/\D/g, '');
  if (clean.length === 11) return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
  return cuit;
}

function getDocLetter(invoiceType: string, documentCode: string): string {
  const codeMap: Record<string, string> = {
    '001': 'A', '002': 'A', '003': 'A', '051': 'A',
    '006': 'B', '007': 'B', '008': 'B',
    '011': 'C', '012': 'C', '013': 'C',
  };
  return codeMap[documentCode] || invoiceType || 'B';
}

function getDocType(documentType: string): string {
  if (documentType?.includes('credito') || documentType === 'nota_credito') return 'nota_credito';
  if (documentType?.includes('debito') || documentType === 'nota_debito') return 'nota_debito';
  return 'factura';
}

function buildInvoiceHTML(invoice: any, company: Record<string, any>): string {
  const { docData } = buildInvoicePrintData(invoice, company);
  const docType = getDocType(invoice.documentType);
  const docTitle = DOCUMENT_TYPE_LABELS[docType] || 'COMPROBANTE';
  const letter = docData.documentLetter;
  const showIVA = letter === 'A';
  const condIvaEmisor = CONDICION_IVA_LABELS[company.condicionIva || 'responsable_inscripto'] || company.condicionIva || '';
  const condIvaReceptor = invoice.customerTaxCondition ? (CONDICION_IVA_LABELS[invoice.customerTaxCondition] || invoice.customerTaxCondition) : 'Consumidor Final';
  const fullAddress = [company.address, company.city, company.province].filter(Boolean).join(' - ');
  const items = docData.items;

  const itemsRows = items.map((item: any) => {
    const qty = item.quantity || 1;
    const price = item.unitPrice || 0;
    const subtotal = item.subtotal || item.total || (qty * price);
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">${item.name || item.description || 'Item'}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${qty}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(price)}</td>
      ${showIVA ? `<td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.ivaRate || item.taxRate || 21}%</td>` : ''}
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatCurrency(subtotal)}</td>
    </tr>`;
  }).join('');

  // QR code URL for AFIP
  let qrSection = '';
  if (invoice.cae && company.cuit) {
    const qrData = {
      ver: 1,
      fecha: new Date(invoice.createdAt).toISOString().slice(0, 10),
      cuit: company.cuit?.replace(/\D/g, '') || '',
      ptoVta: invoice.pointOfSale || 1,
      tipoCmp: parseInt(invoice.documentCode) || 6,
      nroCmp: invoice.sequenceNumber || 1,
      importe: invoice.total,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: 99,
      nroDocRec: 0,
      tipoCodAut: 'E',
      codAut: parseInt(invoice.cae) || 0,
    };
    const b64 = Buffer.from(JSON.stringify(qrData)).toString('base64');
    const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl)}`;
    qrSection = `
      <div style="display:flex;align-items:flex-end;gap:12px;">
        <img src="${qrImageUrl}" alt="QR AFIP" style="width:100px;height:100px;border:1px solid #cbd5e1;border-radius:4px;" />
        <div style="font-size:7.5pt;color:#475569;">
          <div style="font-weight:700;color:#1e293b;margin-bottom:2px;">Comprobante Autorizado</div>
          <div>CAE Nº: <span style="font-weight:700;">${invoice.cae}</span></div>
          <div>Fecha Vto. CAE: <span style="font-weight:700;">${invoice.caeExpiration ? formatAfipCalendarDate(invoice.caeExpiration) : '-'}</span></div>
        </div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 8mm 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 9pt; line-height: 1.4; color: #1a1a1a; }
    .doc-wrap { position: relative; display: flex; flex-direction: column; min-height: 100%; }
    .doc-watermark {
      position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0;
    }
    .doc-watermark span {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 68pt; font-weight: 800; color: #94a3b8; opacity: 0.055;
      letter-spacing: 12px; white-space: nowrap; user-select: none;
    }
    .doc-content { position: relative; z-index: 1; display: flex; flex-direction: column; min-height: 100%; }
  </style>
</head>
<body>
  <div class="doc-wrap">
    <div class="doc-watermark" aria-hidden="true"><span>EMITIA</span></div>
    <div class="doc-content">
    <!-- HEADER -->
    <div style="display:grid;grid-template-columns:1fr 70px 1fr;border-bottom:3px solid #1a1a1a;">
      <div style="padding:16px 20px;border-right:3px solid #1a1a1a;">
        ${company.logo ? `<img src="${company.logo}" alt="Logo" style="max-height:50px;max-width:180px;object-fit:contain;margin-bottom:8px;" />` : ''}
        <div style="font-size:15pt;font-weight:800;color:#0f172a;">${company.legalName || company.businessName || 'Mi Negocio'}</div>
        ${company.legalName && company.businessName && company.legalName !== company.businessName ? `<div style="font-size:9pt;color:#475569;font-style:italic;">${company.businessName}</div>` : ''}
        <div style="font-size:7.5pt;color:#334155;line-height:1.7;margin-top:8px;">
          ${fullAddress ? `<div>${fullAddress}</div>` : ''}
          ${company.phone ? `<div>Tel: ${company.phone}</div>` : ''}
          ${company.email ? `<div>${company.email}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;border-right:3px solid #1a1a1a;background:#f8fafc;">
        <div style="font-size:38pt;font-weight:900;color:#0f172a;">${letter}</div>
        <div style="font-size:7pt;color:#64748b;margin-top:3px;font-weight:600;">COD. ${(invoice.documentCode || '').padStart(3, '0')}</div>
      </div>
      <div style="padding:16px 20px;">
        <div style="font-size:11pt;font-weight:800;color:#0f172a;text-transform:uppercase;">${docTitle}</div>
        <div style="font-size:12pt;font-weight:800;margin:5px 0;color:#0f172a;">Nº ${invoice.invoiceNumber}</div>
        <div style="font-size:7.5pt;color:#334155;line-height:1.7;margin-top:8px;">
          <div><span style="font-weight:700;">Fecha de Emisión:</span> ${formatDate(invoice.createdAt)}</div>
          ${invoice.paymentDueDate ? `<div><span style="font-weight:700;">Vto. de Pago:</span> ${formatDate(invoice.paymentDueDate)}</div>` : ''}
          <div style="margin-top:4px;border-top:1px solid #e2e8f0;padding-top:4px;">
            <div><span style="font-weight:700;">CUIT:</span> ${formatCUIT(company.cuit)}</div>
            <div><span style="font-weight:700;">IIBB:</span> ${company.iibb || '-'}</div>
            <div><span style="font-weight:700;">Cond. IVA:</span> ${condIvaEmisor}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- CUSTOMER -->
    <div style="border-bottom:2px solid #1a1a1a;background:#f8fafc;">
      <div style="display:grid;grid-template-columns:1fr 1fr;font-size:8pt;">
        <div style="padding:10px 20px;border-right:1px solid #e2e8f0;">
          <div style="margin-bottom:4px;"><span style="font-weight:700;min-width:90px;display:inline-block;">Razón Social:</span> ${invoice.customerName || 'Consumidor Final'}</div>
          <div style="margin-bottom:4px;"><span style="font-weight:700;min-width:90px;display:inline-block;">CUIT / DNI:</span> ${invoice.customerDocument ? formatCUIT(invoice.customerDocument) : '-'}</div>
          <div><span style="font-weight:700;min-width:90px;display:inline-block;">Domicilio:</span> ${invoice.customerAddress || '-'}</div>
        </div>
        <div style="padding:10px 20px;">
          <div style="margin-bottom:4px;"><span style="font-weight:700;min-width:90px;display:inline-block;">Cond. IVA:</span> ${condIvaReceptor}</div>
        </div>
      </div>
    </div>

    <!-- ITEMS -->
    <div style="flex:1;">
      <table style="width:100%;border-collapse:collapse;font-size:8pt;">
        <thead>
          <tr style="background:#0f172a;color:#fff;">
            <th style="padding:7px 12px;text-align:left;font-weight:700;">DESCRIPCIÓN</th>
            <th style="padding:7px 12px;text-align:center;font-weight:700;width:60px;">CANT.</th>
            <th style="padding:7px 12px;text-align:right;font-weight:700;width:90px;">P. UNIT.</th>
            ${showIVA ? '<th style="padding:7px 12px;text-align:center;font-weight:700;width:60px;">IVA</th>' : ''}
            <th style="padding:7px 12px;text-align:right;font-weight:700;width:100px;">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </div>

    <!-- TOTALS -->
    <div style="display:flex;justify-content:flex-end;padding:12px 20px;border-top:3px solid #1a1a1a;">
      <div style="width:300px;">
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:8.5pt;color:#475569;">
          <span>Subtotal:</span><span style="font-weight:600;">${formatCurrency(invoice.subtotal || 0)}</span>
        </div>
        ${showIVA && invoice.tax > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:8.5pt;color:#475569;"><span>IVA ${invoice.taxRate || 21}%:</span><span style="font-weight:600;">${formatCurrency(invoice.tax)}</span></div>` : ''}
        ${!showIVA && invoice.tax > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:7.5pt;color:#94a3b8;font-style:italic;"><span>IVA incluido:</span><span>${formatCurrency(invoice.tax)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:14pt;font-weight:900;border-top:3px solid #1a1a1a;padding-top:8px;margin-top:6px;color:#0f172a;">
          <span>TOTAL</span><span>${formatCurrency(invoice.total)}</span>
        </div>
      </div>
    </div>

    ${invoice.observations ? `<div style="padding:8px 20px;font-size:7.5pt;border-top:1px solid #e2e8f0;color:#64748b;"><span style="font-weight:700;color:#475569;">Observaciones: </span>${invoice.observations}</div>` : ''}

    <!-- CAE / QR -->
    <div style="border-top:2px solid #1a1a1a;padding:12px 20px;display:flex;justify-content:space-between;align-items:flex-end;">
      ${qrSection}
    </div>

    <div style="text-align:center;padding:6px 20px;font-size:6.5pt;color:#94a3b8;border-top:1px solid #f1f5f9;background:#fafafa;">
      Comprobante emitido con <span style="font-weight:700;">EMITIA</span> — Sistema de Gestión y Facturación Electrónica — emitia.com.ar
    </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 });
    }

    const { invoiceId, recipientEmail } = await req.json();
    if (!invoiceId || !recipientEmail) {
      return NextResponse.json({ error: 'Faltan datos: invoiceId y recipientEmail son requeridos' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Fetch invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { company: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 });
    }

    if (invoice.companyId !== companyId) {
      return NextResponse.json({ error: 'Sin acceso a este comprobante' }, { status: 403 });
    }

    const company = invoice.company;
    const htmlContent = buildInvoiceHTML(invoice, company);

    const docType = getDocType(invoice.documentType);
    const docTitle = DOCUMENT_TYPE_LABELS[docType] || 'Comprobante';
    const letter = getDocLetter(invoice.invoiceType, invoice.documentCode);
    const companyName = company.legalName || company.name || 'EMITIA';

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#0f172a;padding:24px 30px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">${companyName}</h1>
        </div>
        <div style="padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:16px;color:#1e293b;margin:0 0 8px;">Estimado/a <strong>${invoice.customerName}</strong>,</p>
          <p style="color:#475569;margin:0 0 20px;">Le enviamos su comprobante:</p>
          
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:0 0 20px;">
            <table style="width:100%;font-size:14px;">
              <tr>
                <td style="color:#64748b;padding:4px 0;">Tipo:</td>
                <td style="font-weight:600;color:#1e293b;padding:4px 0;text-align:right;">${docTitle} ${letter}</td>
              </tr>
              <tr>
                <td style="color:#64748b;padding:4px 0;">Número:</td>
                <td style="font-weight:600;color:#1e293b;padding:4px 0;text-align:right;">${invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="color:#64748b;padding:4px 0;">Fecha:</td>
                <td style="font-weight:600;color:#1e293b;padding:4px 0;text-align:right;">${formatDate(invoice.createdAt)}</td>
              </tr>
              <tr style="border-top:2px solid #e2e8f0;">
                <td style="color:#64748b;padding:8px 0 4px;font-size:16px;">Total:</td>
                <td style="font-weight:800;color:#0f172a;padding:8px 0 4px;text-align:right;font-size:18px;">${formatCurrency(invoice.total)}</td>
              </tr>
            </table>
          </div>
          
          ${invoice.cae ? `<p style="font-size:12px;color:#16a34a;margin:0 0 20px;">CAE: ${invoice.cae}</p>` : ''}
          
          <p style="color:#64748b;font-size:13px;margin:0 0 16px;">El comprobante completo está debajo.</p>
          <p style="color:#94a3b8;font-size:11px;margin:20px 0 0;border-top:1px solid #e2e8f0;padding-top:16px;">Este email fue enviado desde <strong>${companyName}</strong> a través de EMITIA.</p>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      ${htmlContent}
    `;

    const emailResult = await sendSystemEmail({
      to: recipientEmail,
      subject: `${docTitle} ${letter} ${invoice.invoiceNumber} — ${companyName}`,
      html: emailHtml,
      senderAlias: companyName,
    });

    if (!emailResult.success) {
      return NextResponse.json({ error: 'Error al enviar email: ' + (emailResult.message || '') }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Comprobante enviado a ${recipientEmail}`,
    });

  } catch (error: any) {
    console.error('[send-email] Error:', error);
    return NextResponse.json({ error: 'Error al enviar comprobante: ' + (error.message || '') }, { status: 500 });
  }
}
