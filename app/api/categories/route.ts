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

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
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

    const { requireTenant } = await import('@/lib/tenant');
    const scoped = requireTenant(session, req);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.companyId;

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: { companyId, name, description },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return NextResponse.json(
      { error: 'Error al crear categoría' },
      { status: 500 }
    );
  }
}
