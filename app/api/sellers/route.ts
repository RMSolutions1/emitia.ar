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

    const where: any = { isActive: true };
    if (!isSuperadmin) {
      if (!companyId) {
        return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
      }
      where.companyId = companyId;
    }

    const sellers = await prisma.seller.findMany({
      where,
      include: { _count: { select: { commissions: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(sellers);
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

    const { requireTenant } = await import('@/lib/tenant');
    const scoped = requireTenant(session, req);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.companyId;

    const body = await req.json();
    const { name, email, phone, document, commissionRate, fixedCommission, userId } = body;

    const seller = await prisma.seller.create({
      data: {
        companyId,
        name,
        email,
        phone,
        document,
        commissionRate: parseFloat(commissionRate || 0),
        fixedCommission: parseFloat(fixedCommission || 0),
        userId,
      },
    });

    return NextResponse.json(seller, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
