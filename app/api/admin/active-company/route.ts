import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { ACTIVE_COMPANY_COOKIE, getTenantFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const tenant = getTenantFromRequest(session, req);
  if (!tenant) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!tenant.companyId) {
    return NextResponse.json({ companyId: null, company: null });
  }

  const company = await prisma.company.findUnique({
    where: { id: tenant.companyId },
    select: { id: true, name: true, cuit: true, plan: true, defaultPOS: true, status: true },
  });

  return NextResponse.json({ companyId: tenant.companyId, company });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo el superadmin cambia de empresa' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';

  if (!companyId) {
    const res = NextResponse.json({ ok: true, companyId: null });
    res.cookies.set(ACTIVE_COMPANY_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
    return res;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, cuit: true, plan: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true, company });
  res.cookies.set(ACTIVE_COMPANY_COOKIE, company.id, cookieOptions());
  return res;
}
