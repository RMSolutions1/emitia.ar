// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Obtener recibos de cobro
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // For company isolation, get customer IDs belonging to this company
    let companyCustomerFilter: Record<string, unknown> = {};
    if (userRole !== 'superadmin') {
      const companyCustomers = await prisma.customer.findMany({
        where: { companyId },
        select: { id: true },
      });
      companyCustomerFilter = { customerId: { in: companyCustomers.map(c => c.id) } };
    }

    const receipts = await prisma.receipt.findMany({
      where: {
        ...companyCustomerFilter,
        ...(customerId && { customerId }),
        ...(from && { date: { gte: new Date(from) } }),
        ...(to && { date: { lte: new Date(to) } }),
      },
      include: { items: true },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json({ error: 'Error al obtener recibos' }, { status: 500 });
  }
}

// POST - Crear recibo de cobro
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    const body = await request.json();
    const { customerId, customerName, items, notes } = body;

    // Verify customer belongs to same company
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
      }
      if (userRole !== 'superadmin' && customer.companyId !== companyId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    // Generar número de recibo
    const lastReceipt = await prisma.receipt.findFirst({
      orderBy: { receiptNumber: 'desc' },
    });
    const nextNum = lastReceipt 
      ? parseInt(lastReceipt.receiptNumber.replace(/^REC-/, '')) + 1 
      : 1;
    const receiptNumber = `REC-${nextNum.toString().padStart(6, '0')}`;

    const totalAmount = items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        customerId,
        customerName,
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

    // Registrar movimiento en cuenta corriente
    const account = await prisma.customerAccount.findUnique({
      where: { customerId },
    });

    if (account) {
      const newBalance = account.balance - totalAmount;
      await prisma.$transaction([
        prisma.accountMovement.create({
          data: {
            type: 'credit',
            concept: 'payment',
            description: `Recibo ${receiptNumber}`,
            amount: totalAmount,
            balance: newBalance,
            referenceType: 'receipt',
            referenceId: receipt.id,
            customerAccountId: account.id,
          },
        }),
        prisma.customerAccount.update({
          where: { id: account.id },
          data: { balance: newBalance, lastMovementAt: new Date() },
        }),
      ]);
    }

    return NextResponse.json(receipt);
  } catch (error) {
    console.error('Error creating receipt:', error);
    return NextResponse.json({ error: 'Error al crear recibo' }, { status: 500 });
  }
}
