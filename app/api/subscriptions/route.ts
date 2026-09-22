import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

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

    const where: any = {};
    if (!isSuperadmin) {
      if (!companyId) {
        return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
      }
      where.companyId = companyId;
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: { items: true },
      orderBy: { nextBillingDate: 'asc' },
    });

    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const stats = {
      total: subscriptions.length,
      active: subscriptions.filter((s) => s.status === 'active').length,
      monthlyRevenue: subscriptions
        .filter((s) => s.status === 'active')
        .reduce((sum, s) => sum + (s.amount || 0), 0),
      dueSoon: subscriptions.filter(
        (s) =>
          s.status === 'active' &&
          s.nextBillingDate &&
          new Date(s.nextBillingDate) <= in7Days &&
          new Date(s.nextBillingDate) >= now,
      ).length,
    };

    return NextResponse.json({ subscriptions, stats });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
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
    const { name, customerId, customerName, amount, frequency, dayOfMonth, startDate, endDate, invoiceType, items, notes } = body;

    const subscription = await prisma.subscription.create({
      data: {
        companyId,
        name,
        customerId,
        customerName,
        amount: parseFloat(amount),
        frequency,
        dayOfMonth,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        nextBillingDate: new Date(startDate),
        invoiceType: invoiceType || 'B',
        notes,
        items: items ? { create: items } : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
