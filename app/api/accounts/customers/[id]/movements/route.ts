import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Agregar movimiento a cuenta corriente de cliente
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

    // Verify customer belongs to company
    const customer = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && customer.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { type, concept, description, amount, dueDate, referenceType, referenceId } = body;

    // Obtener o crear cuenta
    let account = await prisma.customerAccount.findUnique({
      where: { customerId: params.id },
    });

    if (!account) {
      account = await prisma.customerAccount.create({
        data: { customerId: params.id },
      });
    }

    const newBalance = type === 'debit' 
      ? account.balance + amount 
      : account.balance - amount;

    const [movement] = await prisma.$transaction([
      prisma.accountMovement.create({
        data: {
          type,
          concept,
          description,
          amount,
          balance: newBalance,
          dueDate: dueDate ? new Date(dueDate) : null,
          referenceType,
          referenceId,
          customerAccountId: account.id,
        },
      }),
      prisma.customerAccount.update({
        where: { id: account.id },
        data: {
          balance: newBalance,
          lastMovementAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json(movement);
  } catch (error) {
    console.error('Error creating account movement:', error);
    return NextResponse.json({ error: 'Error al crear movimiento' }, { status: 500 });
  }
}
