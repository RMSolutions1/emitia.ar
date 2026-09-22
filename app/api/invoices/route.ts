import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getLastAuthorizedVoucher, getCompanyCuit } from '@/lib/afip';
import { normalizeDocumentCode } from '@/lib/document-codes';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { getTenantFromRequest, tenantWhere } = await import('@/lib/tenant');
    const tenant = getTenantFromRequest(session, req);
    if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const scoped = tenantWhere(tenant);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.where.companyId;
    const isSuperadmin = false;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (!isSuperadmin) {
      if (!companyId) {
        return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
      }
      where.companyId = companyId;
    }
    if (status) where.status = status;
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Map document code to invoice type letter
function getInvoiceTypeFromCode(code: string): string {
  const codeNum = parseInt(code);
  const aTypes = [1, 2, 3, 4, 5, 51, 52, 53]; // Facturas, ND, NC, Recibos A + Retención (ex M)
  const bTypes = [6, 7, 8, 9, 10]; // B
  const cTypes = [11, 12, 13, 15, 16]; // C
  const eTypes = [19, 20, 21]; // E (Export)
  const tTypes = [22]; // T (Turismo)
  if (aTypes.includes(codeNum)) return 'A';
  if (bTypes.includes(codeNum)) return 'B';
  if (cTypes.includes(codeNum)) return 'C';
  if (eTypes.includes(codeNum)) return 'E';
  if (tTypes.includes(codeNum)) return 'T';
  return 'B';
}

// Determine document type from code
function getDocumentTypeFromCode(code: string): string {
  const codeNum = parseInt(code);
  const facturas = [1, 6, 11, 19, 51, 201, 206, 211]; // Facturas
  const nd = [2, 7, 12, 20, 52, 202, 207, 212]; // Notas de débito
  const nc = [3, 8, 13, 21, 53, 203, 208, 213]; // Notas de crédito
  const recibos = [4, 9, 15]; // Recibos
  if (facturas.includes(codeNum)) return 'factura';
  if (nd.includes(codeNum)) return 'nota_debito';
  if (nc.includes(codeNum)) return 'nota_credito';
  if (recibos.includes(codeNum)) return 'recibo';
  return 'factura';
}

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
    const {
      customerName,
      customerDocument,
      customerTaxCondition,
      customerAddress,
      invoiceType: rawInvoiceType,
      documentCode,
      concept,
      serviceStartDate,
      serviceEndDate,
      paymentDueDate,
      pointOfSale,
      subtotal: rawSubtotal,
      tax: rawTax,
      total: rawTotal,
      items,
      notes,
      observations,
      saleId,
      customerId,
      linkedInvoiceId,
    } = body;

    // Calculate totals from items if not provided
    let calcSubtotal = 0;
    let calcTax = 0;
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemSubtotal = (item.quantity || 1) * (item.unitPrice || 0);
        const discountAmount = itemSubtotal * ((item.discount || 0) / 100);
        const afterDiscount = itemSubtotal - discountAmount;
        calcSubtotal += afterDiscount;
        calcTax += afterDiscount * ((item.taxRate || 0) / 100);
      }
    }

    const finalSubtotal = rawSubtotal != null ? parseFloat(rawSubtotal) : calcSubtotal;
    const finalTax = rawTax != null ? parseFloat(rawTax) : calcTax;
    const finalTotal = rawTotal != null ? parseFloat(rawTotal) : (finalSubtotal + finalTax);

    // Determine invoice type from documentCode or explicit invoiceType
    const finalDocumentCode = normalizeDocumentCode(documentCode || '006') || '006';
    const invoiceType = rawInvoiceType || getInvoiceTypeFromCode(finalDocumentCode);
    const documentType = getDocumentTypeFromCode(finalDocumentCode);

    // Get next invoice number from AFIP (authoritative source)
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const pos = pointOfSale || company?.defaultPOS;
    if (!pos || pos < 1) {
      return NextResponse.json({
        error: 'Configurá el punto de venta que tu comercio delegó a EMITIA.',
      }, { status: 400 });
    }
    const cbteTipo = parseInt(finalDocumentCode);

    let sequenceNumber = company?.nextInvoiceNum || 1;
    try {
      const companyCuit = await getCompanyCuit(companyId);
      const lastAuthorized = await getLastAuthorizedVoucher(pos, cbteTipo, companyCuit);
      sequenceNumber = lastAuthorized + 1;
    } catch (e) {
      console.warn('[Invoices] Could not get AFIP last voucher, using internal counter:', (e as any)?.message);
    }
    const invoiceNumber = `${String(pos).padStart(4, '0')}-${String(sequenceNumber).padStart(8, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber,
        invoiceType,
        documentCode: finalDocumentCode,
        documentType,
        pointOfSale: pos,
        sequenceNumber,
        concept: concept || 1,
        customerName: customerName || 'Consumidor Final',
        customerDocument: customerDocument || null,
        customerTaxCondition: customerTaxCondition || 'consumidor_final',
        customerAddress: customerAddress || null,
        customerId: customerId || null,
        saleId: saleId || null,
        linkedInvoiceId: linkedInvoiceId || null,
        subtotal: finalSubtotal,
        taxNetAmount: finalSubtotal,
        tax: finalTax,
        total: finalTotal,
        items: items && Array.isArray(items) ? (items as any) : undefined,
        notes: observations || notes || null,
        status: 'pendiente',
        serviceStartDate: serviceStartDate ? new Date(serviceStartDate) : null,
        serviceEndDate: serviceEndDate ? new Date(serviceEndDate) : null,
        paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
      },
    });

    // Mantener ficha del cliente sincronizada con lo emitido
    if (customerId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          ...(customerTaxCondition ? { taxCondition: customerTaxCondition } : {}),
          ...(customerAddress ? { address: customerAddress } : {}),
          ...(customerName ? { name: customerName } : {}),
        },
      }).catch(() => {});
    }

    // Do not increment internal counter here — AFIP update will set the real number

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear factura:', error);
    return NextResponse.json({ error: 'Error al crear factura: ' + (error.message || '') }, { status: 500 });
  }
}
