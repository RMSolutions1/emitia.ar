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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: any = {};
    if (!isSuperadmin) {
      if (!companyId) {
        return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
      }
      where.companyId = companyId;
    }
    if (type) where.type = type;
    if (status) where.status = status;

    const checks = await prisma.check.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(checks);
  } catch (error) {
    console.error('Error al obtener cheques:', error);
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
    const { type, checkNumber, bankName, bankCode, amount, issueDate, dueDate, payee, drawer, cuit, notes } = body;

    const check = await prisma.check.create({
      data: {
        companyId,
        type,
        checkNumber,
        bankName,
        bankCode,
        amount: parseFloat(amount),
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        payee,
        drawer,
        cuit,
        notes,
        status: 'in_portfolio',
      },
    });

    return NextResponse.json(check, { status: 201 });
  } catch (error) {
    console.error('Error al crear cheque:', error);
    return NextResponse.json({ error: 'Error al crear cheque' }, { status: 500 });
  }
}
