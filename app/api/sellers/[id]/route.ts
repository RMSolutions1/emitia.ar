// @ts-nocheck
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

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const seller = await prisma.seller.findUnique({
      where: { id: params.id },
      include: {
        commissions: {
          where: {
            ...(from && { createdAt: { gte: new Date(from) } }),
            ...(to && { createdAt: { lte: new Date(to) } }),
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    if (userRole !== 'superadmin' && seller.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const stats = {
      totalSales: seller.commissions.reduce((sum, c) => sum + c.saleTotal, 0),
      totalCommissions: seller.commissions.reduce((sum, c) => sum + c.amount, 0),
      pendingCommissions: seller.commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
      paidCommissions: seller.commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
      salesCount: seller.commissions.length,
    };

    return NextResponse.json({ seller, stats });
  } catch (error) {
    console.error('Error fetching seller:', error);
    return NextResponse.json({ error: 'Error al obtener vendedor' }, { status: 500 });
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

    const existing = await prisma.seller.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && existing.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, document, commissionRate, fixedCommission, isActive } = body;

    const seller = await prisma.seller.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(document !== undefined && { document }),
        ...(commissionRate !== undefined && { commissionRate }),
        ...(fixedCommission !== undefined && { fixedCommission }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(seller);
  } catch (error) {
    console.error('Error updating seller:', error);
    return NextResponse.json({ error: 'Error al actualizar vendedor' }, { status: 500 });
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

    const existing = await prisma.seller.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && existing.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.seller.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting seller:', error);
    return NextResponse.json({ error: 'Error al eliminar vendedor' }, { status: 500 });
  }
}
