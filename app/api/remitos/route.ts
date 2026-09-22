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

    const companyId = (session.user as any).companyId;
    const isSuperadmin = (session.user as any).role === 'superadmin';

    const where: any = { documentType: 'remito' };
    if (!isSuperadmin && companyId) {
      where.companyId = companyId;
    }

    const remitos = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(remitos);
  } catch (error) {
    console.error('Error al obtener remitos:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const body = await req.json();
    const {
      customerId,
      customerName,
      customerDocument,
      customerAddress,
      customerTaxCondition,
      items,
      transportInfo,
      observations,
    } = body;

    if (!customerName) {
      return NextResponse.json({ error: 'Debe indicar un cliente' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Debe agregar al menos un ítem' }, { status: 400 });
    }

    // Get next remito number
    const lastRemito = await prisma.invoice.findFirst({
      where: { companyId, documentType: 'remito' },
      orderBy: { sequenceNumber: 'desc' },
    });
    const sequenceNumber = (lastRemito?.sequenceNumber || 0) + 1;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const pos = company?.defaultPOS || 1;
    const invoiceNumber = `REM-${String(pos).padStart(4, '0')}-${String(sequenceNumber).padStart(8, '0')}`;

    const remito = await prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber,
        invoiceType: 'X',
        documentCode: '091', // Remito code
        documentType: 'remito',
        pointOfSale: pos,
        sequenceNumber,
        concept: 1,
        customerName,
        customerDocument: customerDocument || null,
        customerTaxCondition: customerTaxCondition || 'consumidor_final',
        customerAddress: customerAddress || null,
        customerId: customerId || null,
        subtotal: 0,
        taxNetAmount: 0,
        tax: 0,
        total: 0,
        items: items as any,
        notes: transportInfo || null,
        observations: observations || null,
        status: 'emitida',
      },
    });

    return NextResponse.json({ success: true, remito }, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear remito:', error);
    return NextResponse.json({ error: 'Error al crear remito: ' + (error.message || '') }, { status: 500 });
  }
}
