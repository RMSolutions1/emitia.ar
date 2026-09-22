import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

    const existing = await prisma.check.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cheque no encontrado' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && existing.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { status, endorsedTo, depositAccount, rejectionReason, depositDate } = body;

    const updateData: Record<string, unknown> = { status };

    if (status === 'endorsed' && endorsedTo) {
      updateData.endorsedTo = endorsedTo;
      updateData.endorseDate = new Date();
    }
    if (status === 'deposited' && depositAccount) {
      updateData.depositAccount = depositAccount;
      updateData.depositDate = depositDate ? new Date(depositDate) : new Date();
    }
    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const check = await prisma.check.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(check);
  } catch (error) {
    console.error('Error updating check:', error);
    return NextResponse.json({ error: 'Error al actualizar cheque' }, { status: 500 });
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

    const existing = await prisma.check.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cheque no encontrado' }, { status: 404 });
    }
    if (userRole !== 'superadmin' && existing.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.check.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting check:', error);
    return NextResponse.json({ error: 'Error al eliminar cheque' }, { status: 500 });
  }
}
