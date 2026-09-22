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
    const categoryId = searchParams.get('categoryId');

    // Multi-tenant: filtrar por empresa del usuario
    const { getTenantFromRequest, tenantWhere } = await import('@/lib/tenant');
    const tenant = getTenantFromRequest(session, req);
    if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const scoped = tenantWhere(tenant);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.where.companyId;
    const isSuperadmin = false;

    const where: any = {
      active: true,
    };

    // Solo filtrar por companyId si no es superadmin y tiene companyId
    if (!isSuperadmin) {
      if (!companyId) {
        return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
      }
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
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
    const { name, description, sku, barcode, price, cost, stock, minStock, categoryId } = body;

    if (!name || !sku || price === undefined) {
      return NextResponse.json(
        { error: 'Campos requeridos: name, sku, price' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        companyId,
        name,
        description,
        sku,
        barcode,
        price: parseFloat(price),
        cost: parseFloat(cost ?? 0),
        stock: parseInt(stock ?? 0),
        minStock: parseInt(minStock ?? 10),
        categoryId,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear producto:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'El SKU ya existe en esta empresa' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}
