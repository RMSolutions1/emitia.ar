import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { getTenantFromRequest, tenantWhere } = await import('@/lib/tenant');
    const tenant = getTenantFromRequest(session, req);
    if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const scoped = tenantWhere(tenant);
    if (!scoped.ok) return scoped.response;
    const where: Record<string, unknown> = { ...scoped.where };

    const products = await prisma.product.findMany({
      where: { ...where, active: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    const lines = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || 'Sin categoría',
      stock: p.stock,
      cost: p.cost,
      price: p.price,
      valueCost: p.stock * p.cost,
      valuePrice: p.stock * p.price,
    }));

    const totals = lines.reduce(
      (acc, l) => ({
        totalUnits: acc.totalUnits + l.stock,
        totalCost: acc.totalCost + l.valueCost,
        totalPrice: acc.totalPrice + l.valuePrice,
        productCount: acc.productCount + 1,
      }),
      { totalUnits: 0, totalCost: 0, totalPrice: 0, productCount: 0 },
    );

    return NextResponse.json({ lines, totals });
  } catch (error) {
    console.error('Error inventory value:', error);
    return NextResponse.json({ error: 'Error al calcular valor' }, { status: 500 });
  }
}
