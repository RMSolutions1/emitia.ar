import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { getTenantFromRequest, tenantWhere } = await import('@/lib/tenant');
    const tenant = getTenantFromRequest(session, req);
    if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const scoped = tenantWhere(tenant);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.where.companyId;
    const isSuperadmin = false;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (!isSuperadmin) {
      if (!companyId) {
        return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
      }
      where.companyId = companyId;
    }
    if (status) where.status = status;

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { requireTenant } = await import('@/lib/tenant');
    const scoped = requireTenant(session, req);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.companyId;

    const body = await req.json();
    const {
      customerName,
      customerId,
      saleId,
      pointOfSale,
      subtotal,
      discount,
      total,
      items,
      paymentMethod,
      cashReceived,
      change,
      observations,
    } = body;

    // Obtener el próximo número de ticket para la empresa
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const sequenceNumber = company?.nextTicketNum || 1;
    const pos = pointOfSale || company?.defaultPOS || 1;
    const ticketNumber = `TKT-${String(pos).padStart(4, '0')}-${String(sequenceNumber).padStart(8, '0')}`;

    const ticket = await prisma.ticket.create({
      data: {
        companyId,
        ticketNumber,
        pointOfSale: pos,
        sequenceNumber,
        customerName,
        customerId,
        saleId,
        subtotal: parseFloat(subtotal),
        discount: parseFloat(discount || 0),
        total: parseFloat(total),
        items: items || [],
        paymentMethod: paymentMethod || 'efectivo',
        cashReceived: cashReceived ? parseFloat(cashReceived) : null,
        change: change ? parseFloat(change) : null,
        observations,
        userId: (session.user as any).id,
        userName: session.user.name || undefined,
        status: 'emitido',
      },
    });

    // Actualizar el número de ticket de la empresa
    await prisma.company.update({
      where: { id: companyId },
      data: { nextTicketNum: sequenceNumber + 1 },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Error al crear ticket:', error);
    return NextResponse.json({ error: 'Error al crear ticket' }, { status: 500 });
  }
}
