// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ alerts: [], counts: { total: 0, critical: 0, warning: 0, info: 0 } });
    }

    const { getTenantFromRequest, tenantWhere } = await import('@/lib/tenant');
    const tenant = getTenantFromRequest(session, request);
    if (!tenant) {
      return NextResponse.json({ alerts: [], counts: { total: 0, critical: 0, warning: 0, info: 0 } });
    }
    const scoped = tenantWhere(tenant);
    if (!scoped.ok) {
      return NextResponse.json({ alerts: [], counts: { total: 0, critical: 0, warning: 0, info: 0 }, needsCompany: true });
    }
    const companyFilter = scoped.where;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Run all queries in parallel
    const [
      outOfStockProducts,
      lowStockProducts,
      pendingInvoices,
      overdueAccounts,
      todaySalesCount,
    ] = await Promise.all([
      // Products with 0 stock
      prisma.product.findMany({
        where: { ...companyFilter, stock: { lte: 0 }, active: true },
        select: { id: true, name: true, sku: true, stock: true },
        take: 10,
        orderBy: { stock: 'asc' },
      }),

      // Products with low stock (stock > 0, will filter by minStock in JS)
      prisma.product.findMany({
        where: { ...companyFilter, active: true, stock: { gt: 0, lte: 50 } },
        select: { id: true, name: true, sku: true, stock: true, minStock: true },
        take: 50,
        orderBy: { stock: 'asc' },
      }),

      // Invoices pending (without valid CAE)
      prisma.invoice.findMany({
        where: {
          ...companyFilter,
          OR: [{ cae: null }, { cae: '' }],
          status: { notIn: ['anulada', 'cancelled'] },
        },
        select: { id: true, invoiceNumber: true, total: true, createdAt: true, customerName: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),

      // Customer accounts with positive balance (they owe money)
      prisma.customerAccount.findMany({
        where: {
          balance: { gt: 0 },
          customer: companyFilter,
        },
        select: {
          id: true,
          balance: true,
          customer: { select: { id: true, name: true } },
        },
        take: 10,
        orderBy: { balance: 'desc' },
      }),

      // Today's sales count
      prisma.sale.count({
        where: { ...companyFilter, createdAt: { gte: today } },
      }),
    ]);

    // Filter low stock properly
    const actualLowStock = lowStockProducts.filter(p => p.stock <= (p.minStock || 10));

    // Build alerts array
    const alerts: Array<{
      id: string;
      type: 'critical' | 'warning' | 'info';
      category: string;
      title: string;
      message: string;
      href?: string;
      timestamp: string;
    }> = [];

    // Critical: Out of stock
    if (outOfStockProducts.length > 0) {
      alerts.push({
        id: 'out-of-stock',
        type: 'critical',
        category: 'stock',
        title: 'Productos sin stock',
        message: outOfStockProducts.length === 1
          ? `${outOfStockProducts[0].name} está sin stock`
          : `${outOfStockProducts.length} productos están sin stock`,
        href: '/inventario',
        timestamp: now.toISOString(),
      });
    }

    // Warning: Low stock
    if (actualLowStock.length > 0) {
      alerts.push({
        id: 'low-stock',
        type: 'warning',
        category: 'stock',
        title: 'Stock bajo',
        message: actualLowStock.length === 1
          ? `${actualLowStock[0].name} tiene stock bajo (${actualLowStock[0].stock} uds.)`
          : `${actualLowStock.length} productos con stock bajo`,
        href: '/inventario',
        timestamp: now.toISOString(),
      });
    }

    // Warning: Pending invoices (no CAE)
    if (pendingInvoices.length > 0) {
      const totalPending = pendingInvoices.reduce((s, i) => s + (i.total || 0), 0);
      alerts.push({
        id: 'pending-invoices',
        type: 'warning',
        category: 'facturacion',
        title: 'Facturas pendientes',
        message: `${pendingInvoices.length} factura${pendingInvoices.length > 1 ? 's' : ''} sin CAE por $${totalPending.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
        href: '/facturas',
        timestamp: now.toISOString(),
      });
    }

    // Warning: Overdue accounts
    if (overdueAccounts.length > 0) {
      const totalDebt = overdueAccounts.reduce((s, a) => s + (a.balance || 0), 0);
      alerts.push({
        id: 'overdue-accounts',
        type: 'warning',
        category: 'cuentas',
        title: 'Cuentas por cobrar',
        message: `${overdueAccounts.length} cliente${overdueAccounts.length > 1 ? 's' : ''} con deuda por $${totalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
        href: '/cuentas-corrientes',
        timestamp: now.toISOString(),
      });
    }

    // Info: Today's sales
    alerts.push({
      id: 'today-sales',
      type: 'info',
      category: 'ventas',
      title: 'Ventas de hoy',
      message: todaySalesCount === 0
        ? 'Sin ventas registradas hoy'
        : `${todaySalesCount} venta${todaySalesCount > 1 ? 's' : ''} registrada${todaySalesCount > 1 ? 's' : ''} hoy`,
      href: '/ventas',
      timestamp: now.toISOString(),
    });

    const counts = {
      total: alerts.length,
      critical: alerts.filter(a => a.type === 'critical').length,
      warning: alerts.filter(a => a.type === 'warning').length,
      info: alerts.filter(a => a.type === 'info').length,
    };

    return NextResponse.json({
      alerts,
      counts,
      details: {
        outOfStockCount: outOfStockProducts.length,
        lowStockCount: actualLowStock.length,
        pendingInvoicesCount: pendingInvoices.length,
        overdueAccountsCount: overdueAccounts.length,
        todaySalesCount,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ alerts: [], counts: { total: 0, critical: 0, warning: 0, info: 0 } });
  }
}
