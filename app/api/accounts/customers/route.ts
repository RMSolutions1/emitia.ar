// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Obtener cuentas corrientes de clientes
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const withBalance = searchParams.get('withBalance');

    const accounts = await prisma.customerAccount.findMany({
      where: {
        // Filter through customer relation for company isolation
        ...(userRole !== 'superadmin' ? { customer: { companyId } } : {}),
        ...(status && { status }),
        ...(withBalance === 'positive' && { balance: { gt: 0 } }),
        ...(withBalance === 'negative' && { balance: { lt: 0 } }),
      },
      include: {
        customer: true,
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const stats = {
      totalAccounts: accounts.length,
      totalDebt: accounts.reduce((sum, acc) => sum + (acc.balance > 0 ? acc.balance : 0), 0),
      totalCredit: accounts.reduce((sum, acc) => sum + (acc.balance < 0 ? Math.abs(acc.balance) : 0), 0),
      accountsWithDebt: accounts.filter(acc => acc.balance > 0).length,
    };

    return NextResponse.json({ accounts, stats });
  } catch (error) {
    console.error('Error fetching customer accounts:', error);
    return NextResponse.json({ error: 'Error al obtener cuentas' }, { status: 500 });
  }
}

// POST - Crear cuenta corriente para un cliente
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    const body = await request.json();
    const { customerId, creditLimit, notes } = body;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Verify customer belongs to same company
    if (userRole !== 'superadmin' && customer.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const existingAccount = await prisma.customerAccount.findUnique({
      where: { customerId },
    });

    if (existingAccount) {
      return NextResponse.json({ error: 'El cliente ya tiene cuenta corriente' }, { status: 400 });
    }

    const account = await prisma.customerAccount.create({
      data: {
        customerId,
        creditLimit: creditLimit || 0,
        notes,
      },
      include: { customer: true },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error creating customer account:', error);
    return NextResponse.json({ error: 'Error al crear cuenta' }, { status: 500 });
  }
}
