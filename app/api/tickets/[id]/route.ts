import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Obtener ticket por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        company: true
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Verificar acceso a la empresa
    const userRole = (session.user as any)?.role;
    const userCompanyId = (session.user as any)?.companyId;
    
    if (userRole !== 'superadmin' && ticket.companyId !== userCompanyId) {
      return NextResponse.json({ error: 'Sin acceso a este ticket' }, { status: 403 });
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        items: typeof ticket.items === 'string' ? JSON.parse(ticket.items as string) : ticket.items,
      },
      business: ticket.company, // Retornar company como business para compatibilidad
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Error al obtener ticket' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar ticket (solo anular)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el usuario tiene acceso
    const existingTicket = await prisma.ticket.findUnique({
      where: { id }
    });
    
    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }
    
    const userRole = (session.user as any)?.role;
    const userCompanyId = (session.user as any)?.companyId;
    
    if (userRole !== 'superadmin' && existingTicket.companyId !== userCompanyId) {
      return NextResponse.json({ error: 'Sin acceso a este ticket' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (status !== 'anulado') {
      return NextResponse.json(
        { error: 'Solo se puede anular un ticket' },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status: 'anulado' },
    });

    return NextResponse.json({
      success: true,
      ticket: {
        ...ticket,
        items: typeof ticket.items === 'string' ? JSON.parse(ticket.items as string) : ticket.items,
      },
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Error al actualizar ticket' },
      { status: 500 }
    );
  }
}
