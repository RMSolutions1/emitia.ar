// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '50');

    // For company isolation, get sale IDs for this company
    let companySaleIds: string[] | null = null;
    if (userRole !== 'superadmin') {
      const companySales = await prisma.sale.findMany({
        where: { companyId },
        select: { id: true },
      });
      companySaleIds = companySales.map(s => s.id);
    }

    const where: Record<string, unknown> = {};
    
    if (companySaleIds !== null) {
      where.saleId = { in: companySaleIds };
    }
    
    if (provider) where.provider = provider;
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {} as Record<string, Date>;
      if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
    }

    const transactions = await prisma.paymentTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    const statsWhere = companySaleIds !== null ? { saleId: { in: companySaleIds } } : {};
    const stats = await prisma.paymentTransaction.groupBy({
      by: ['status'],
      where: statsWhere,
      _count: true,
      _sum: { amount: true }
    });

    return NextResponse.json({
      transactions,
      stats: stats.reduce((acc, s) => {
        acc[s.status] = { count: s._count as unknown as number, total: s._sum?.amount || 0 };
        return acc;
      }, {} as Record<string, { count: number; total: number }>)
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 });
  }
}
