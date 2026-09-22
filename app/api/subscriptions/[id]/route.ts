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

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    if (userRole !== 'superadmin' && subscription.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Error al obtener suscripción' }, { status: 500 });
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

    const existing = await prisma.subscription.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && existing.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { status, amount, nextBillingDate, notes } = body;

    const subscription = await prisma.subscription.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(amount !== undefined && { amount }),
        ...(nextBillingDate && { nextBillingDate: new Date(nextBillingDate) }),
        ...(notes !== undefined && { notes }),
      },
      include: { items: true },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Error al actualizar suscripción' }, { status: 500 });
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

    const existing = await prisma.subscription.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && existing.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.subscription.update({
      where: { id: params.id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json({ error: 'Error al cancelar suscripción' }, { status: 500 });
  }
}
