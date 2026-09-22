import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const companyId = (session.user as { companyId?: string }).companyId;
    const isSuperadmin = (session.user as { role?: string }).role === 'superadmin';

    const where: Record<string, unknown> = {};
    if (!isSuperadmin && companyId) where.companyId = companyId;

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
