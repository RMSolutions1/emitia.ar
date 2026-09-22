import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { startOfDay, startOfMonth, subDays, subMonths, endOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTenantFromRequest, tenantWhere } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenant = getTenantFromRequest(session, req);
    if (!tenant) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const scoped = tenantWhere(tenant);
    const userName = (session?.user as { name?: string | null } | undefined)?.name || 'Usuario';
    if (!scoped.ok) {
      return NextResponse.json({
        needsCompany: true,
        userName,
        todayRevenue: 0,
        todayCount: 0,
        monthRevenue: 0,
        monthCount: 0,
        totalProducts: 0,
        totalCustomers: 0,
        pendingInvoicesCount: 0,
        chartData: [],
        monthlyChartData: [],
        topProducts: [],
        recentSales: [],
        onboarding: null,
      });
    }
    const companyFilter = scoped.where;

    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    const sevenDaysAgo = subDays(today, 7);
    const fourteenDaysAgo = subDays(today, 14);
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = subDays(monthStart, 1);
    const thirtyDaysAgo = subDays(today, 30);

    const [
      todaySales,
      yesterdaySales,
      monthSales,
      lastMonthSales,
      totalProducts,
      allProducts,
      totalCustomers,
      lastMonthCustomers,
      pendingInvoices,
      weeklySales,
      prevWeeklySales,
      recentSales,
      totalSuppliers,
      accountsReceivable,
      monthlySalesRaw,
      topProductsSales,
      totalInvoicesMonth,
      topClientsSales,
      caeExpiringSoon,
      unpaidInvoices,
      monthInvoices,
      creditNotesMonth,
      supplierAccounts,
      saleItemsMonth,
    ] = await Promise.all([
      // Ventas del día
      prisma.sale.findMany({
        where: { ...companyFilter, createdAt: { gte: today, lte: todayEnd }, status: 'completed' },
        select: { total: true, paymentMethod: true },
      }),
      // Ventas de ayer (para comparación)
      prisma.sale.findMany({
        where: { ...companyFilter, createdAt: { gte: subDays(today, 1), lt: today }, status: 'completed' },
        select: { total: true },
      }),
      // Ventas del mes
      prisma.sale.findMany({
        where: { ...companyFilter, createdAt: { gte: monthStart }, status: 'completed' },
        select: { total: true, paymentMethod: true },
      }),
      // Ventas del mes anterior (para comparación)
      prisma.sale.findMany({
        where: { ...companyFilter, createdAt: { gte: lastMonthStart, lt: monthStart }, status: 'completed' },
        select: { total: true },
      }),
      // Total productos
      prisma.product.count({ where: companyFilter }),
      // Productos con stock
      prisma.product.findMany({
        where: companyFilter,
        select: { stock: true, minStock: true, name: true, sku: true, price: true },
      }),
      // Total clientes actuales
      prisma.customer.count({ where: companyFilter }),
      // Clientes mes anterior
      prisma.customer.count({
        where: { ...companyFilter, createdAt: { lt: monthStart } },
      }),
      // Facturas pendientes (sin CAE)
      prisma.invoice.findMany({
        where: {
          ...companyFilter,
          OR: [{ cae: null }, { cae: '' }, { cae: 'PENDIENTE' }],
          status: { not: 'anulada' },
          documentType: 'factura',
        },
        select: { total: true },
      }),
      // Ventas últimos 7 días (para gráfico)
      prisma.sale.findMany({
        where: { ...companyFilter, createdAt: { gte: sevenDaysAgo }, status: 'completed' },
        select: { total: true, createdAt: true },
      }),
      // Ventas 7 días anteriores (para comparación)
      prisma.sale.findMany({
        where: { ...companyFilter, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, status: 'completed' },
        select: { total: true },
      }),
      // Últimas 10 ventas
      prisma.sale.findMany({
        where: { ...companyFilter, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          saleNumber: true,
          total: true,
          paymentMethod: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      }),
      // Total proveedores
      prisma.supplier.count({ where: companyFilter }),
      // Cuentas por cobrar
      prisma.customerAccount.findMany({
        where: { balance: { gt: 0 } },
        select: { balance: true },
      }),
      // Ventas últimos 30 días (para gráfico mensual)
      prisma.sale.findMany({
        where: { ...companyFilter, createdAt: { gte: thirtyDaysAgo }, status: 'completed' },
        select: { total: true, createdAt: true },
      }),
      // Top 5 productos más vendidos del mes
      prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: { ...companyFilter, createdAt: { gte: monthStart }, status: 'completed' },
        },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 5,
      }),
      // Total facturas emitidas en el mes
      prisma.invoice.count({
        where: { ...companyFilter, createdAt: { gte: monthStart }, status: { not: 'anulada' } },
      }),
      // Top 5 clientes por facturación del mes
      prisma.invoice.groupBy({
        by: ['customerName'],
        where: { ...companyFilter, createdAt: { gte: monthStart }, status: { not: 'anulada' }, documentType: 'factura' },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      // Facturas con CAE próximo a vencer (7 días)
      prisma.invoice.findMany({
        where: {
          ...companyFilter,
          cae: { not: null },
          caeExpiration: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
          status: { not: 'anulada' },
        },
        select: { id: true, invoiceNumber: true, customerName: true, total: true, caeExpiration: true },
        orderBy: { caeExpiration: 'asc' },
        take: 5,
      }),
      // Facturas impagas / pendientes de cobro
      prisma.invoice.findMany({
        where: {
          ...companyFilter,
          status: 'pendiente',
          documentType: 'factura',
        },
        select: { id: true, invoiceNumber: true, customerName: true, total: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 5,
      }),
      // Facturas del mes (ventas fiscales)
      prisma.invoice.findMany({
        where: {
          ...companyFilter,
          createdAt: { gte: monthStart },
          status: { not: 'anulada' },
          documentType: 'factura',
        },
        select: { total: true, tax: true, customerName: true },
      }),
      // Notas de crédito del mes
      prisma.invoice.findMany({
        where: {
          ...companyFilter,
          createdAt: { gte: monthStart },
          status: { not: 'anulada' },
          documentType: 'nota_credito',
        },
        select: { total: true },
      }),
      // Cuentas por pagar (proveedores)
      prisma.supplierAccount.findMany({
        where: {
          balance: { gt: 0 },
          supplier: companyFilter,
        },
        select: { balance: true, lastMovementAt: true },
      }),
      // Unidades vendidas del mes
      prisma.saleItem.aggregate({
        where: {
          sale: { ...companyFilter, createdAt: { gte: monthStart }, status: 'completed' },
        },
        _sum: { quantity: true },
      }),
    ]);

    // Calculate KPIs
    const todayRevenue = todaySales.reduce((s: number, v: any) => s + v.total, 0);
    const todayCount = todaySales.length;
    const yesterdayRevenue = yesterdaySales.reduce((s: number, v: any) => s + v.total, 0);
    const monthRevenue = monthSales.reduce((s: number, v: any) => s + v.total, 0);
    const monthCount = monthSales.length;
    const lastMonthRevenue = lastMonthSales.reduce((s: number, v: any) => s + v.total, 0);
    const prevWeekRevenue = prevWeeklySales.reduce((s: number, v: any) => s + v.total, 0);
    const weekRevenue = weeklySales.reduce((s: number, v: any) => s + v.total, 0);
    const lowStockProducts = allProducts.filter((p: any) => p.stock <= (p.minStock || 5)).length;
    const outOfStockProducts = allProducts.filter((p: any) => p.stock === 0).length;
    const pendingInvoicesCount = pendingInvoices.length;
    const pendingInvoicesTotal = pendingInvoices.reduce((s: number, i: any) => s + i.total, 0);
    const totalReceivable = accountsReceivable.reduce((s: number, a: any) => s + a.balance, 0);
    const newCustomersThisMonth = totalCustomers - lastMonthCustomers;

    // Trends (% change)
    const todayTrend = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
    const monthTrend = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const weekTrend = prevWeekRevenue > 0 ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : 0;

    // Payment methods breakdown (this month)
    const paymentBreakdown: Record<string, { total: number; count: number }> = {};
    monthSales.forEach((s: any) => {
      const method = s.paymentMethod || 'cash';
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { total: 0, count: 0 };
      paymentBreakdown[method].total += s.total;
      paymentBreakdown[method].count += 1;
    });

    // Low stock list (top 8)
    const lowStockList = allProducts
      .filter((p: any) => p.stock <= (p.minStock || 5))
      .sort((a: any, b: any) => a.stock - b.stock)
      .slice(0, 8)
      .map((p: any) => ({ name: p.name, sku: p.sku, stock: p.stock, minStock: p.minStock || 5, price: p.price }));

    // Chart data (7 days)
    const salesByDay: Record<string, { total: number; count: number }> = {};
    for (let i = 0; i < 7; i++) {
      const date = subDays(today, 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      salesByDay[dateStr] = { total: 0, count: 0 };
    }
    weeklySales.forEach((sale: any) => {
      const dateStr = format(new Date(sale.createdAt), 'yyyy-MM-dd');
      if (salesByDay[dateStr]) {
        salesByDay[dateStr].total += sale.total;
        salesByDay[dateStr].count += 1;
      }
    });
    const chartData = Object.entries(salesByDay).map(([date, data]) => ({
      date,
      label: format(new Date(date), 'EEE dd', { locale: es }),
      total: Math.round(data.total),
      count: data.count,
    }));

    // Monthly chart data (30 days grouped by week)
    const monthlyByDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const date = subDays(today, 29 - i);
      monthlyByDay[format(date, 'yyyy-MM-dd')] = 0;
    }
    monthlySalesRaw.forEach((sale: any) => {
      const dateStr = format(new Date(sale.createdAt), 'yyyy-MM-dd');
      if (monthlyByDay[dateStr] !== undefined) {
        monthlyByDay[dateStr] += sale.total;
      }
    });
    const monthlyChartData = Object.entries(monthlyByDay).map(([date, total]) => ({
      date,
      label: format(new Date(date), 'dd/MM'),
      total: Math.round(total),
    }));

    // Top products
    let topProducts: Array<{ name: string; quantity: number; revenue: number }> = [];
    if (topProductsSales.length > 0) {
      const productIds = topProductsSales.map((p: any) => p.productId).filter(Boolean);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
      const productMap = new Map(products.map((p: any) => [p.id, p.name]));
      topProducts = topProductsSales.map((p: any) => ({
        name: productMap.get(p.productId) || 'Producto eliminado',
        quantity: p._sum?.quantity || 0,
        revenue: Math.round(p._sum?.subtotal || 0),
      }));
    }

    // Recent sales formatted
    const recentSalesFormatted = recentSales.map((s: any) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      total: s.total,
      paymentMethod: s.paymentMethod,
      customerName: s.customer?.name || 'Consumidor Final',
      date: s.createdAt.toISOString(),
    }));

    // Average ticket
    const avgTicketToday = todayCount > 0 ? Math.round(todayRevenue / todayCount) : 0;
    const avgTicketMonth = monthCount > 0 ? Math.round(monthRevenue / monthCount) : 0;

    // Top clients
    const topClients = topClientsSales.map((c: any) => ({
      name: c.customerName || 'Consumidor Final',
      total: Math.round(c._sum?.total || 0),
      count: c._count?.id || 0,
    }));

    // CAE alerts
    const caeAlerts = caeExpiringSoon.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      total: inv.total,
      caeExpiration: inv.caeExpiration?.toISOString(),
    }));

    // Unpaid invoices
    const unpaidInvoicesList = unpaidInvoices.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      total: inv.total,
      date: inv.createdAt?.toISOString(),
    }));

    const totalPayable = supplierAccounts.reduce((s: number, a: any) => s + a.balance, 0);
    const salesTaxMonth = monthInvoices.reduce((s: number, i: any) => s + (i.tax || 0), 0);
    const totalSalesInvoicesMonth = monthInvoices.reduce((s: number, i: any) => s + i.total, 0);
    const creditNotesTotal = creditNotesMonth.reduce((s: number, i: any) => s + i.total, 0);
    const productsSoldMonth = saleItemsMonth._sum?.quantity || 0;
    const customersWithSales = new Set(monthInvoices.map((i: any) => i.customerName)).size;

    // CxC vigentes vs vencidas (movimientos con dueDate)
    const receivableMovements = await prisma.accountMovement.findMany({
      where: {
        customerAccountId: { not: null },
        type: 'debit',
        customerAccount: { customer: companyFilter },
      },
      select: { amount: true, dueDate: true },
    });
    let receivableCurrent = 0;
    let receivableOverdue = 0;
    let receivableCurrentDocs = 0;
    let receivableOverdueDocs = 0;
    for (const m of receivableMovements) {
      const overdue = m.dueDate && new Date(m.dueDate) < today;
      if (overdue) {
        receivableOverdue += m.amount;
        receivableOverdueDocs += 1;
      } else {
        receivableCurrent += m.amount;
        receivableCurrentDocs += 1;
      }
    }

    const activeCompany = await prisma.company.findUnique({
      where: { id: companyFilter.companyId },
      select: { cuit: true, defaultPOS: true },
    });

    return NextResponse.json({
      userName,
      // KPIs
      todayRevenue,
      todayCount,
      todayTrend: Math.round(todayTrend),
      yesterdayRevenue,
      monthRevenue,
      monthCount,
      monthTrend: Math.round(monthTrend),
      lastMonthRevenue,
      weekRevenue,
      weekTrend: Math.round(weekTrend),
      avgTicketToday,
      avgTicketMonth,
      // Inventory
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      // Clients
      totalCustomers,
      newCustomersThisMonth,
      totalSuppliers,
      // Invoicing
      pendingInvoicesCount,
      pendingInvoicesTotal,
      totalInvoicesMonth,
      totalReceivable,
      // Data
      paymentBreakdown,
      chartData,
      monthlyChartData,
      topProducts,
      recentSales: recentSalesFormatted,
      lowStockList,
      topClients,
      caeAlerts,
      unpaidInvoicesList,
      businessSummary: {
        accountsReceivable: totalReceivable,
        receivableCurrent,
        receivableOverdue,
        receivableCurrentDocs,
        receivableOverdueDocs,
        accountsPayable: totalPayable,
        payableCurrent: totalPayable,
        payableOverdue: 0,
        salesTaxMonth,
        productsSoldMonth,
        creditNotesTotal,
        customersWithSales,
        totalSalesInvoicesMonth,
        salesTrend: Math.round(monthTrend),
      },
      needsCompany: false,
      onboarding: {
        hasCuit: (activeCompany?.cuit || '').replace(/\D/g, '').length === 11,
        hasPos: (activeCompany?.defaultPOS || 0) > 0,
        hasProducts: totalProducts > 0,
        hasCustomers: totalCustomers > 0,
        hasInvoices: totalInvoicesMonth > 0 || pendingInvoicesCount > 0,
      },
    });
  } catch (error) {
    console.error('Error en dashboard:', error);
    return NextResponse.json({ error: 'Error al obtener datos del dashboard' }, { status: 500 });
  }
}
