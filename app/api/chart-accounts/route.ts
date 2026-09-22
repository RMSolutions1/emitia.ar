import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEFAULT_CHART_ACCOUNTS } from '@/lib/chart-accounts-default';
import { requireTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

async function ensureDefaultAccounts(companyId: string) {
  const count = await prisma.chartAccount.count({ where: { companyId } });
  if (count > 0) return;

  await prisma.chartAccount.createMany({
    data: DEFAULT_CHART_ACCOUNTS.map((a) => ({
      companyId,
      code: a.code,
      name: a.name,
      type: a.type,
      parentCode: a.parentCode,
    })),
  });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const scoped = requireTenant(session, req);
    if (!scoped.ok) return scoped.response;
    const targetCompanyId = scoped.companyId;
    await ensureDefaultAccounts(targetCompanyId);

    const accounts = await prisma.chartAccount.findMany({
      where: { companyId: targetCompanyId, isActive: true },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error chart accounts:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const scoped = requireTenant(session, req);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.companyId;

    const body = await req.json();
    const { code, name, type, parentCode } = body;
    if (!code || !name || !type) {
      return NextResponse.json({ error: 'Código, nombre y tipo requeridos' }, { status: 400 });
    }

    const account = await prisma.chartAccount.create({
      data: { companyId, code, name, type, parentCode: parentCode || null },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Error creating chart account:', error);
    return NextResponse.json({ error: 'Error al crear cuenta' }, { status: 500 });
  }
}
