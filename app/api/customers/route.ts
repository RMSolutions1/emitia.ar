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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';

    const { getTenantFromRequest, tenantWhere } = await import('@/lib/tenant');
    const tenant = getTenantFromRequest(session, req);
    if (!tenant) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const scoped = tenantWhere(tenant);
    if (!scoped.ok) return scoped.response;
    const where: any = { ...scoped.where };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Multi-tenant: obtener companyId del usuario
    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: 'Usuario sin empresa asignada' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, phone, document, documentType, address, city, province, taxCondition, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: { companyId, name, email, phone, document, documentType, address, city, province, taxCondition, notes },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear cliente:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'El documento ya existe en esta empresa' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear cliente' },
      { status: 500 }
    );
  }
}
