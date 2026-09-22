import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Actualizar precios masivamente
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;
    const companyFilter = userRole === 'superadmin' ? {} : { companyId };

    const body = await request.json();
    const { priceListId, percentage, operation, categoryId, applyToBase } = body;

    const multiplier = operation === 'increase' 
      ? 1 + (percentage / 100) 
      : 1 - (percentage / 100);

    let updated = 0;

    if (priceListId) {
      // Verify ownership of price list
      const priceList = await prisma.priceList.findUnique({ where: { id: priceListId } });
      if (!priceList) {
        return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
      }
      if (userRole !== 'superadmin' && priceList.companyId !== companyId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const items = await prisma.priceListItem.findMany({
        where: { priceListId },
      });

      for (const item of items) {
        if (categoryId) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          });
          if (product?.categoryId !== categoryId) continue;
        }

        await prisma.priceListItem.update({
          where: { id: item.id },
          data: { price: Math.round(item.price * multiplier * 100) / 100 },
        });
        updated++;
      }
    }

    if (applyToBase) {
      const where = { ...companyFilter, ...(categoryId ? { categoryId } : {}) };
      const products = await prisma.product.findMany({ where });

      for (const product of products) {
        await prisma.product.update({
          where: { id: product.id },
          data: { price: Math.round(product.price * multiplier * 100) / 100 },
        });
        updated++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      updated,
      message: `Se actualizaron ${updated} precios (${operation === 'increase' ? '+' : '-'}${percentage}%)` 
    });
  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json({ error: 'Error al actualizar precios' }, { status: 500 });
  }
}
