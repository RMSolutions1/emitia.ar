import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;
    const { id } = params;

    const existing = await prisma.recurringInvoice.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    if (userRole !== 'superadmin' && existing.companyId !== companyId) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const body = await req.json();

    // Toggle active
    if (body.action === 'toggle') {
      const updated = await prisma.recurringInvoice.update({
        where: { id },
        data: { isActive: !existing.isActive },
      });
      return NextResponse.json(updated);
    }

    // Full update
    const updated = await prisma.recurringInvoice.update({
      where: { id },
      data: {
        customerName: body.customerName ?? existing.customerName,
        customerDocument: body.customerDocument ?? existing.customerDocument,
        customerTaxCondition: body.customerTaxCondition ?? existing.customerTaxCondition,
        customerAddress: body.customerAddress ?? existing.customerAddress,
        documentCode: body.documentCode ?? existing.documentCode,
        invoiceType: body.invoiceType ?? existing.invoiceType,
        items: body.items ?? existing.items,
        subtotal: body.subtotal ?? existing.subtotal,
        tax: body.tax ?? existing.tax,
        total: body.total ?? existing.total,
        frequency: body.frequency ?? existing.frequency,
        dayOfMonth: body.dayOfMonth ?? existing.dayOfMonth,
        observations: body.observations ?? existing.observations,
        endDate: body.endDate ? new Date(body.endDate) : existing.endDate,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating recurring invoice:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;
    const { id } = params;

    const existing = await prisma.recurringInvoice.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    if (userRole !== 'superadmin' && existing.companyId !== companyId) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await prisma.recurringInvoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring invoice:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
