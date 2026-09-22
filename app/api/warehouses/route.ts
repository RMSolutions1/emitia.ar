import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureDefaultWarehouse(companyId: string) {
  const count = await prisma.warehouse.count({ where: { companyId } });
  if (count > 0) return;

  await prisma.warehouse.create({
    data: {
      companyId,
      name: 'Depósito Principal',
      code: 'DEP-01',
      isDefault: true,
      isActive: true,
    },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const companyId = (session.user as { companyId?: string }).companyId;
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 403 });

    await ensureDefaultWarehouse(companyId);

    const warehouses = await prisma.warehouse.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const productStats = await prisma.product.aggregate({
      where: { companyId, active: true },
      _count: { id: true },
      _sum: { stock: true },
    });

    return NextResponse.json({
      warehouses,
      totals: {
        productCount: productStats._count.id,
        totalUnits: productStats._sum.stock || 0,
      },
    });
  } catch (error) {
    console.error('Error warehouses:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const companyId = (session.user as { companyId?: string }).companyId;
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 403 });

    const body = await req.json();
    const { name, code, address, city, notes, isDefault } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }

    const warehouseCode =
      code?.trim() ||
      `DEP-${String((await prisma.warehouse.count({ where: { companyId } })) + 1).padStart(2, '0')}`;

    if (isDefault) {
      await prisma.warehouse.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        companyId,
        name: name.trim(),
        code: warehouseCode,
        address: address || null,
        city: city || null,
        notes: notes || null,
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error('Error creating warehouse:', error);
    return NextResponse.json({ error: 'Error al crear depósito' }, { status: 500 });
  }
}
