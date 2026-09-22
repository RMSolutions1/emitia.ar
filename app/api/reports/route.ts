// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { getTenantFromRequest, tenantWhere } = await import('@/lib/tenant');
    const tenant = getTenantFromRequest(session, request);
    if (!tenant) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const scoped = tenantWhere(tenant);
    if (!scoped.ok) return scoped.response;
    const companyFilter = scoped.where;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate + 'T23:59:59') })
    };

    if (type === 'sales') {
      const sales = await prisma.sale.findMany({
        where: {
          ...companyFilter,
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
        },
        include: {
          customer: true,
          items: {
            include: { product: { include: { category: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
      const totalSales = sales.length;
      const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

      const salesByDay = sales.reduce((acc: Record<string, { total: number; count: number }>, sale) => {
        const date = sale.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { total: 0, count: 0 };
        }
        acc[date].total += sale.total;
        acc[date].count += 1;
        return acc;
      }, {});

      const salesByPayment = sales.reduce((acc: Record<string, number>, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
        return acc;
      }, {});

      return NextResponse.json({
        summary: { totalRevenue, totalSales, averageTicket },
        salesByDay: Object.entries(salesByDay).map(([date, data]) => ({ date, ...data })),
        salesByPayment: Object.entries(salesByPayment).map(([method, total]) => ({ method, total })),
        sales
      });
    }

    if (type === 'products') {
      // Get products for this company first, then filter saleItems
      const companyProducts = await prisma.product.findMany({
        where: companyFilter,
        select: { id: true },
      });
      const productIds = companyProducts.map(p => p.id);

      const topProducts = await prisma.saleItem.groupBy({
        by: ['productId'],
        where: { productId: { in: productIds } },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 20
      });

      const topProductIds = topProducts.map(p => p.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        include: { category: true }
      });

      const result = topProducts.map(tp => {
        const product = products.find(p => p.id === tp.productId);
        return {
          ...product,
          totalSold: tp._sum.quantity,
          totalRevenue: tp._sum.subtotal
        };
      });

      return NextResponse.json(result);
    }

    if (type === 'inventory') {
      const products = await prisma.product.findMany({
        where: { ...companyFilter, active: true },
        include: { category: true },
        orderBy: { stock: 'asc' }
      });

      const lowStock = products.filter(p => p.stock <= p.minStock);
      const totalValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
      const totalRetailValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

      return NextResponse.json({
        products,
        summary: {
          totalProducts: products.length,
          lowStockCount: lowStock.length,
          totalValue,
          totalRetailValue,
          potentialProfit: totalRetailValue - totalValue
        },
        lowStock
      });
    }

    if (type === 'customers') {
      const customers = await prisma.customer.findMany({
        where: companyFilter,
        include: {
          sales: {
            select: { total: true, createdAt: true }
          }
        }
      });

      const result = customers.map(c => ({
        ...c,
        totalPurchases: c.sales.length,
        totalSpent: c.sales.reduce((sum, s) => sum + s.total, 0),
        lastPurchase: c.sales.length > 0 ? c.sales[c.sales.length - 1].createdAt : null
      })).sort((a, b) => b.totalSpent - a.totalSpent);

      return NextResponse.json(result);
    }

    // ═══════ IVA VENTAS ═══════
    if (type === 'iva_ventas') {
      const invoices = await prisma.invoice.findMany({
        where: {
          ...companyFilter,
          documentType: { in: ['factura', 'nota_debito', 'nota_credito'] },
          status: { not: 'anulada' },
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
        },
        orderBy: { createdAt: 'asc' }
      });

      const rows = invoices.map((inv) => {
        const items = (inv.items as any[]) || [];
        // Build IVA breakdown from items
        const ivaBreakdown: Record<number, { base: number; amount: number }> = {};
        let netoGravado = 0;
        let ivaTotal = 0;

        if (items.length > 0) {
          for (const item of items) {
            const qty = item.quantity || 1;
            const price = item.unitPrice || 0;
            const disc = item.discount || 0;
            const base = qty * price * (1 - disc / 100);
            const rate = item.ivaRate || item.taxRate || 21;
            const iva = base * (rate / 100);
            if (!ivaBreakdown[rate]) ivaBreakdown[rate] = { base: 0, amount: 0 };
            ivaBreakdown[rate].base += base;
            ivaBreakdown[rate].amount += iva;
            netoGravado += base;
            ivaTotal += iva;
          }
        } else {
          // Fallback to invoice-level values
          const rate = inv.taxRate || 21;
          netoGravado = inv.subtotal;
          ivaTotal = inv.tax;
          ivaBreakdown[rate] = { base: netoGravado, amount: ivaTotal };
        }

        const sign = inv.documentType === 'nota_credito' ? -1 : 1;

        return {
          id: inv.id,
          fecha: inv.createdAt,
          tipo: inv.documentType,
          letra: inv.invoiceType,
          comprobante: inv.invoiceNumber,
          puntoVenta: inv.pointOfSale,
          cuit: inv.customerDocument || '',
          cliente: inv.customerName,
          condicionIva: inv.customerTaxCondition,
          netoGravado: netoGravado * sign,
          exento: (inv.exemptAmount || 0) * sign,
          noGravado: 0,
          iva21: (ivaBreakdown[21]?.amount || 0) * sign,
          iva105: (ivaBreakdown[10.5]?.amount || 0) * sign,
          iva27: (ivaBreakdown[27]?.amount || 0) * sign,
          otrosImpuestos: (inv.otherTaxes || 0) * sign,
          total: inv.total * sign,
          cae: inv.cae || '',
          ivaBreakdown: Object.entries(ivaBreakdown).map(([rate, data]) => ({
            rate: parseFloat(rate),
            base: data.base * sign,
            amount: data.amount * sign
          })),
        };
      });

      // Summary
      const totals = rows.reduce((acc, r) => ({
        netoGravado: acc.netoGravado + r.netoGravado,
        iva21: acc.iva21 + r.iva21,
        iva105: acc.iva105 + r.iva105,
        iva27: acc.iva27 + r.iva27,
        exento: acc.exento + r.exento,
        otrosImpuestos: acc.otrosImpuestos + r.otrosImpuestos,
        total: acc.total + r.total,
      }), { netoGravado: 0, iva21: 0, iva105: 0, iva27: 0, exento: 0, otrosImpuestos: 0, total: 0 });

      return NextResponse.json({ rows, totals, count: rows.length });
    }

    // ═══════ IVA COMPRAS ═══════
    if (type === 'iva_compras') {
      // Purchase orders with received status
      const purchases = await prisma.purchaseOrder.findMany({
        where: {
          ...companyFilter,
          status: { in: ['received', 'partial'] },
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
        },
        include: {
          supplier: true,
          items: { include: { product: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      const rows = purchases.map((po) => {
        let netoGravado = 0;
        let iva21 = 0;
        let iva105 = 0;
        let iva27 = 0;

        for (const item of po.items) {
          const base = item.quantity * item.unitCost;
          netoGravado += base;
          // Default 21% IVA on purchases
          iva21 += base * 0.21;
        }

        return {
          id: po.id,
          fecha: po.createdAt,
          comprobante: po.orderNumber,
          proveedor: po.supplier?.name || 'N/A',
          cuit: po.supplier?.cuit || '',
          netoGravado,
          iva21,
          iva105,
          iva27,
          otrosImpuestos: 0,
          total: netoGravado + iva21 + iva105 + iva27,
        };
      });

      const totals = rows.reduce((acc, r) => ({
        netoGravado: acc.netoGravado + r.netoGravado,
        iva21: acc.iva21 + r.iva21,
        iva105: acc.iva105 + r.iva105,
        iva27: acc.iva27 + r.iva27,
        otrosImpuestos: acc.otrosImpuestos + r.otrosImpuestos,
        total: acc.total + r.total,
      }), { netoGravado: 0, iva21: 0, iva105: 0, iva27: 0, otrosImpuestos: 0, total: 0 });

      return NextResponse.json({ rows, totals, count: rows.length });
    }

    // ═══════ RENTABILIDAD ═══════
    if (type === 'rentabilidad') {
      const sales = await prisma.sale.findMany({
        where: {
          ...companyFilter,
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
        },
        include: {
          items: {
            include: { product: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      let totalRevenue = 0;
      let totalCost = 0;
      const productProfitability: Record<string, { name: string; sku: string; revenue: number; cost: number; quantity: number }> = {};

      for (const sale of sales) {
        for (const item of sale.items) {
          const revenue = item.subtotal;
          const cost = (item.product?.cost || 0) * item.quantity;
          totalRevenue += revenue;
          totalCost += cost;

          const pid = item.productId;
          if (!productProfitability[pid]) {
            productProfitability[pid] = {
              name: item.product?.name || 'Producto eliminado',
              sku: item.product?.sku || '',
              revenue: 0,
              cost: 0,
              quantity: 0
            };
          }
          productProfitability[pid].revenue += revenue;
          productProfitability[pid].cost += cost;
          productProfitability[pid].quantity += item.quantity;
        }
      }

      const products = Object.values(productProfitability)
        .map(p => ({
          ...p,
          profit: p.revenue - p.cost,
          margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0
        }))
        .sort((a, b) => b.profit - a.profit);

      return NextResponse.json({
        summary: {
          totalRevenue,
          totalCost,
          grossProfit: totalRevenue - totalCost,
          grossMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
          totalSales: sales.length,
        },
        products
      });
    }

    return NextResponse.json({ error: 'Tipo de reporte no válido' }, { status: 400 });
  } catch (error) {
    console.error('Error al generar reporte:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
