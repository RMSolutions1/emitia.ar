import { NextRequest, NextResponse } from 'next/server';
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
    const productFilter: Record<string, unknown> = { ...scoped.where };

    const productIds = (await prisma.product.findMany({
      where: productFilter,
      select: { id: true, name: true, sku: true },
    })).map((p) => p.id);

    const movements = await prisma.stockMovement.findMany({
      where: { productId: { in: productIds } },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Error fetching adjustments:', error);
    return NextResponse.json({ error: 'Error al obtener ajustes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const companyId = (session.user as { companyId?: string }).companyId;
    const body = await req.json();
    const { productId, type, quantity, reason } = body;

    if (!productId || !type || quantity === undefined) {
      return NextResponse.json({ error: 'Producto, tipo y cantidad requeridos' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.companyId !== companyId) {
      return NextResponse.json({ error: 'Producto no válido' }, { status: 403 });
    }

    const qty = Math.abs(parseInt(String(quantity), 10));
    let delta = qty;
    if (type === 'out') delta = -qty;
    if (type === 'adjustment') delta = parseInt(String(quantity), 10) - product.stock;

    const newStock = product.stock + delta;
    if (newStock < 0) {
      return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
    }

    const [movement, updated] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId,
          type: type === 'adjustment' ? 'adjustment' : type,
          quantity: Math.abs(delta),
          reason: reason || 'Ajuste manual',
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock },
      }),
    ]);

    return NextResponse.json({ movement, product: updated }, { status: 201 });
  } catch (error) {
    console.error('Error stock adjustment:', error);
    return NextResponse.json({ error: 'Error al ajustar stock' }, { status: 500 });
  }
}
