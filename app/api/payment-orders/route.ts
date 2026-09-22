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
    const suppliers = await prisma.supplier.findMany({ where: scoped.where, select: { id: true } });
    const filter: Record<string, unknown> = { supplierId: { in: suppliers.map((s) => s.id) } };

    const orders = await prisma.paymentOrder.findMany({
      where: filter,
      include: { items: true },
      orderBy: { date: 'desc' },
      take: 200,
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error payment orders:', error);
    return NextResponse.json({ error: 'Error al obtener pagos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const companyId = (session.user as { companyId?: string }).companyId;
    const body = await req.json();
    const { supplierId, supplierName, items, notes } = body;

    if (!supplierId || !items?.length) {
      return NextResponse.json({ error: 'Proveedor e items requeridos' }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier || supplier.companyId !== companyId) {
      return NextResponse.json({ error: 'Proveedor no válido' }, { status: 403 });
    }

    const last = await prisma.paymentOrder.findFirst({ orderBy: { orderNumber: 'desc' } });
    const nextNum = last ? parseInt(last.orderNumber.replace(/^PAG-/, ''), 10) + 1 : 1;
    const orderNumber = `PAG-${String(nextNum).padStart(6, '0')}`;
    const totalAmount = items.reduce((s: number, i: { amount: number }) => s + i.amount, 0);

    const order = await prisma.paymentOrder.create({
      data: {
        orderNumber,
        supplierId,
        supplierName: supplierName || supplier.name,
        totalAmount,
        notes,
        items: {
          create: items.map((item: {
            paymentMethod: string;
            amount: number;
            reference?: string;
            bankName?: string;
            checkNumber?: string;
            checkDate?: string;
          }) => ({
            paymentMethod: item.paymentMethod,
            amount: item.amount,
            reference: item.reference,
            bankName: item.bankName,
            checkNumber: item.checkNumber,
            checkDate: item.checkDate ? new Date(item.checkDate) : null,
          })),
        },
      },
      include: { items: true },
    });

    const account = await prisma.supplierAccount.findUnique({ where: { supplierId } });
    if (account) {
      const newBalance = Math.max(0, account.balance - totalAmount);
      await prisma.$transaction([
        prisma.accountMovement.create({
          data: {
            type: 'credit',
            concept: 'payment',
            description: `Pago ${orderNumber}`,
            amount: totalAmount,
            balance: newBalance,
            referenceType: 'payment_order',
            referenceId: order.id,
            supplierAccountId: account.id,
          },
        }),
        prisma.supplierAccount.update({
          where: { id: account.id },
          data: { balance: newBalance, lastMovementAt: new Date() },
        }),
      ]);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating payment order:', error);
    return NextResponse.json({ error: 'Error al registrar pago' }, { status: 500 });
  }
}
