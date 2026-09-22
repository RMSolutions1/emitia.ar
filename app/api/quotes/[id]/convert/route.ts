import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { QuoteItem } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function resolveProductId(companyId: string, item: QuoteItem): Promise<string> {
  if (item.productId) return item.productId;

  const byName = await prisma.product.findFirst({
    where: {
      companyId,
      name: { equals: item.productName, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (byName) return byName.id;

  const skuBase = item.productSku?.trim() || `PRES-${item.id.slice(-8).toUpperCase()}`;
  const existingSku = await prisma.product.findFirst({
    where: { companyId, sku: skuBase },
    select: { id: true },
  });
  if (existingSku) return existingSku.id;

  const created = await prisma.product.create({
    data: {
      companyId,
      name: item.productName,
      sku: skuBase,
      price: item.unitPrice,
      cost: 0,
      stock: 0,
      active: true,
    },
    select: { id: true },
  });
  return created.id;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const companyId = (session.user as { companyId?: string }).companyId;
    const userRole = (session.user as { role?: string }).role;
    const userId = (session.user as { id?: string }).id;

    if (!companyId && userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
    }

    if (userRole !== 'superadmin' && quote.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (quote.status === 'converted') {
      return NextResponse.json(
        { error: 'Este presupuesto ya fue convertido', saleId: quote.convertedToSale },
        { status: 409 }
      );
    }

    if (quote.items.length === 0) {
      return NextResponse.json({ error: 'El presupuesto no tiene ítems' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const paymentMethod = body.paymentMethod || 'Efectivo';

    const saleItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      subtotal: number;
    }> = [];

    for (const item of quote.items) {
      const productId = await resolveProductId(quote.companyId, item);
      saleItems.push({
        productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        subtotal: item.subtotal,
      });
    }

    const lastSale = await prisma.sale.findFirst({
      where: { companyId: quote.companyId },
      orderBy: { createdAt: 'desc' },
    });
    const nextNum = lastSale ? parseInt(lastSale.saleNumber.split('-')[1] || '0', 10) + 1 : 1;
    const saleNumber = `V-${String(nextNum).padStart(5, '0')}`;

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          companyId: quote.companyId,
          saleNumber,
          customerId: quote.customerId,
          userId: userId ?? null,
          subtotal: quote.subtotal,
          tax: quote.tax,
          discount: quote.discount,
          total: quote.total,
          paymentMethod,
          notes: quote.notes
            ? `Convertido desde ${quote.quoteNumber}. ${quote.notes}`
            : `Convertido desde ${quote.quoteNumber}`,
          status: 'completed',
          items: {
            create: saleItems,
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });

      for (const item of saleItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: 'converted',
          convertedToSale: created.id,
        },
      });

      return created;
    });

    return NextResponse.json({ sale, quoteNumber: quote.quoteNumber }, { status: 201 });
  } catch (error) {
    console.error('Error converting quote:', error);
    return NextResponse.json({ error: 'Error al convertir presupuesto' }, { status: 500 });
  }
}
