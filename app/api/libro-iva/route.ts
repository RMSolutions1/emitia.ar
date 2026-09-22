// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { requireTenant } = await import('@/lib/tenant');
    const scoped = requireTenant(session, req);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.companyId;

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const type = searchParams.get('type') || 'ventas'; // ventas or compras

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    if (type === 'ventas') {
      const invoices = await prisma.invoice.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate, lte: endDate },
          status: { not: 'anulada' },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          invoiceNumber: true,
          documentCode: true,
          documentType: true,
          invoiceType: true,
          createdAt: true,
          customerName: true,
          customerDocument: true,
          customerTaxCondition: true,
          subtotal: true,
          tax: true,
          taxRate: true,
          otherTaxes: true,
          exemptAmount: true,
          total: true,
          cae: true,
          caeExpiration: true,
          pointOfSale: true,
          status: true,
        },
      });

      // Calculate totals
      let totalNetoGravado = 0;
      let totalIVA21 = 0;
      let totalIVA105 = 0;
      let totalIVA27 = 0;
      let totalExento = 0;
      let totalNoGravado = 0;
      let totalOtrosTributos = 0;
      let totalGeneral = 0;

      const rows = invoices.map(inv => {
        const isNC = inv.documentType === 'nota_credito' || ['003', '008', '013'].includes(inv.documentCode);
        const sign = isNC ? -1 : 1;
        const neto = (inv.subtotal || 0) * sign;
        const iva = (inv.tax || 0) * sign;
        const rate = inv.taxRate || 21;
        const exento = (inv.exemptAmount || 0) * sign;
        const otros = (inv.otherTaxes || 0) * sign;
        const total = (inv.total || 0) * sign;

        totalNetoGravado += neto;
        if (rate === 10.5) totalIVA105 += iva;
        else if (rate === 27) totalIVA27 += iva;
        else totalIVA21 += iva;
        totalExento += exento;
        totalOtrosTributos += otros;
        totalGeneral += total;

        return {
          fecha: inv.createdAt,
          tipo: inv.documentCode?.padStart(3, '0') || '006',
          letra: inv.invoiceType || 'B',
          puntoVenta: inv.pointOfSale || 1,
          numero: inv.invoiceNumber,
          documentoReceptor: inv.customerDocument || '',
          nombreReceptor: inv.customerName || 'Consumidor Final',
          condicionIva: inv.customerTaxCondition || 'consumidor_final',
          netoGravado: neto,
          ivaRate: rate,
          iva: iva,
          exento: exento,
          noGravado: 0,
          otrosTributos: otros,
          total: total,
          cae: inv.cae || '',
          status: inv.status,
        };
      });

      return NextResponse.json({
        success: true,
        type: 'ventas',
        period: { month, year },
        rows,
        totals: {
          netoGravado: totalNetoGravado,
          iva21: totalIVA21,
          iva105: totalIVA105,
          iva27: totalIVA27,
          exento: totalExento,
          noGravado: totalNoGravado,
          otrosTributos: totalOtrosTributos,
          total: totalGeneral,
        },
        count: rows.length,
      });
    } else {
      // Libro IVA Compras
      const purchases = await prisma.purchaseOrder.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate, lte: endDate },
          status: { not: 'cancelled' },
        },
        include: { supplier: true },
        orderBy: { createdAt: 'asc' },
      });

      let totalNetoGravado = 0;
      let totalIVA = 0;
      let totalGeneral = 0;

      const rows = purchases.map(po => {
        const neto = (po.subtotal || 0);
        const iva = (po.tax || 0);
        const total = (po.total || 0);
        totalNetoGravado += neto;
        totalIVA += iva;
        totalGeneral += total;

        return {
          fecha: po.createdAt,
          proveedor: po.supplier?.name || 'Sin proveedor',
          cuitProveedor: po.supplier?.cuit || '',
          numero: po.orderNumber || '',
          netoGravado: neto,
          iva: iva,
          total: total,
          status: po.status,
        };
      });

      return NextResponse.json({
        success: true,
        type: 'compras',
        period: { month, year },
        rows,
        totals: {
          netoGravado: totalNetoGravado,
          iva: totalIVA,
          total: totalGeneral,
        },
        count: rows.length,
      });
    }
  } catch (error: any) {
    console.error('Error libro IVA:', error);
    return NextResponse.json({ error: 'Error al generar libro IVA: ' + (error.message || '') }, { status: 500 });
  }
}
