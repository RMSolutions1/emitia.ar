import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Obtener movimientos de una cuenta
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

    // Verify bank account belongs to company
    const bankAccount = await prisma.bankAccount.findUnique({ where: { id: params.id } });
    if (!bankAccount) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && bankAccount.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const movements = await prisma.bankMovement.findMany({
      where: {
        bankAccountId: params.id,
        ...(from && { date: { gte: new Date(from) } }),
        ...(to && { date: { lte: new Date(to) } }),
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 });
  }
}

// POST - Agregar movimiento
export async function POST(
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

    const account = await prisma.bankAccount.findUnique({
      where: { id: params.id },
    });

    if (!account) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    if (userRole !== 'superadmin' && account.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { type, concept, description, amount, reference, date } = body;

    const isPositive = ['deposit', 'transfer_in', 'interest'].includes(type);
    const newBalance = isPositive 
      ? account.balance + amount 
      : account.balance - amount;

    const [movement] = await prisma.$transaction([
      prisma.bankMovement.create({
        data: {
          bankAccountId: params.id,
          type,
          concept,
          description,
          amount,
          balance: newBalance,
          reference,
          date: date ? new Date(date) : new Date(),
        },
      }),
      prisma.bankAccount.update({
        where: { id: params.id },
        data: { balance: newBalance },
      }),
    ]);

    return NextResponse.json(movement);
  } catch (error) {
    console.error('Error creating movement:', error);
    return NextResponse.json({ error: 'Error al crear movimiento' }, { status: 500 });
  }
}
