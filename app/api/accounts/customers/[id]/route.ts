import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Obtener cuenta corriente de un cliente con movimientos
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

    // Verify customer belongs to company
    const customer = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && customer.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const account = await prisma.customerAccount.findUnique({
      where: { customerId: params.id },
      include: {
        customer: true,
        movements: {
          where: {
            ...(from && { createdAt: { gte: new Date(from) } }),
            ...(to && { createdAt: { lte: new Date(to) } }),
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account) {
      const newAccount = await prisma.customerAccount.create({
        data: { customerId: params.id },
        include: { customer: true, movements: true },
      });

      return NextResponse.json(newAccount);
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error fetching customer account:', error);
    return NextResponse.json({ error: 'Error al obtener cuenta' }, { status: 500 });
  }
}

// PUT - Actualizar cuenta corriente
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

    // Verify customer belongs to company
    const customer = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && customer.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { creditLimit, status, notes } = body;

    const account = await prisma.customerAccount.update({
      where: { customerId: params.id },
      data: {
        ...(creditLimit !== undefined && { creditLimit }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: { customer: true },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error updating customer account:', error);
    return NextResponse.json({ error: 'Error al actualizar cuenta' }, { status: 500 });
  }
}
