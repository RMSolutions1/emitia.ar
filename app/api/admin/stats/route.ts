// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Estadísticas globales
    const totalCompanies = await prisma.company.count();
    const activeCompanies = await prisma.company.count({ where: { status: 'active' } });
    const blockedCompanies = await prisma.company.count({ where: { status: 'blocked' } });
    const overdueCompanies = await prisma.company.count({ where: { paymentStatus: 'overdue' } });

    const totalUsers = await prisma.user.count();
    const totalInvoices = await prisma.invoice.count();
    const totalSales = await prisma.sale.count();
    
    // Ingresos totales de suscripciones
    const companies = await prisma.company.findMany({
      select: { subscriptionPrice: true, paymentStatus: true }
    });
    const monthlyRevenue = companies
      .filter(c => c.paymentStatus === 'paid')
      .reduce((sum, c) => sum + (c.subscriptionPrice || 0), 0);

    // Empresas con atraso
    const today = new Date();
    const overdueList = await prisma.company.findMany({
      where: {
        OR: [
          { nextBillingDate: { lt: today }, paymentStatus: 'pending' },
          { paymentStatus: 'overdue' }
        ]
      },
      select: { id: true, name: true, email: true, daysOverdue: true, lastPaymentDate: true }
    });

    return NextResponse.json({
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        blocked: blockedCompanies,
        overdue: overdueCompanies
      },
      users: totalUsers,
      invoices: totalInvoices,
      sales: totalSales,
      monthlyRevenue,
      overdueCompanies: overdueList
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
