import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const isSuperadmin = (session.user as any).role === 'superadmin';

    const where: any = {};
    if (!isSuperadmin && companyId) {
      where.companyId = companyId;
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const body = await req.json();
    const { supplierId, items, expectedDate, notes } = body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Proveedor e items son requeridos' }, { status: 400 });
    }

    // Calculate totals server-side
    const processedItems = items
      .filter((item: any) => item.productId && item.quantity > 0)
      .map((item: any) => ({
        productId: item.productId,
        quantity: parseInt(String(item.quantity)) || 1,
        unitCost: parseFloat(String(item.unitCost)) || 0,
        subtotal: (parseInt(String(item.quantity)) || 1) * (parseFloat(String(item.unitCost)) || 0),
      }));

    if (processedItems.length === 0) {
      return NextResponse.json({ error: 'No hay items válidos' }, { status: 400 });
    }

    const subtotal = processedItems.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const taxRate = parseFloat(body.taxRate) || 21;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    // Generate order number
    const lastOrder = await prisma.purchaseOrder.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    const nextNum = lastOrder ? parseInt(lastOrder.orderNumber.split('-')[1] || '0') + 1 : 1;
    const orderNumber = `OC-${String(nextNum).padStart(5, '0')}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        company: { connect: { id: companyId } },
        orderNumber,
        supplier: { connect: { id: supplierId } },
        subtotal,
        tax,
        total,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: notes || null,
        items: {
          create: processedItems.map((item: any) => ({
            product: { connect: { id: item.productId } },
            quantity: item.quantity,
            unitCost: item.unitCost,
            subtotal: item.subtotal,
          })),
        },
      },
      include: { supplier: true, items: { include: { product: true } } },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json({ error: 'Error al crear orden de compra' }, { status: 500 });
  }
}
