// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    const priceList = await prisma.priceList.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        customers: true,
      },
    });

    if (!priceList) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
    }

    if (userRole !== 'superadmin' && priceList.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const productIds = priceList.items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, price: true },
    });

    const itemsWithProducts = priceList.items.map(item => ({
      ...item,
      product: products.find(p => p.id === item.productId),
    }));

    return NextResponse.json({ ...priceList, items: itemsWithProducts });
  } catch (error) {
    console.error('Error fetching price list:', error);
    return NextResponse.json({ error: 'Error al obtener lista' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    const existing = await prisma.priceList.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && existing.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, isActive, isDefault, items } = body;

    if (isDefault) {
      await prisma.priceList.updateMany({
        where: { companyId: existing.companyId, isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      });
    }

    if (items) {
      await prisma.priceListItem.deleteMany({
        where: { priceListId: params.id },
      });

      await prisma.priceListItem.createMany({
        data: items.map((item: { productId: string; price: number; minQuantity?: number }) => ({
          priceListId: params.id,
          productId: item.productId,
          price: item.price,
          minQuantity: item.minQuantity || 1,
        })),
      });
    }

    const priceList = await prisma.priceList.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
      },
      include: { items: true },
    });

    return NextResponse.json(priceList);
  } catch (error) {
    console.error('Error updating price list:', error);
    return NextResponse.json({ error: 'Error al actualizar lista' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    const existing = await prisma.priceList.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && existing.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.priceList.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting price list:', error);
    return NextResponse.json({ error: 'Error al eliminar lista' }, { status: 500 });
  }
}
