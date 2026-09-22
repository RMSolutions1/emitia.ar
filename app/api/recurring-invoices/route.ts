import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;
    const companyFilter = userRole === 'superadmin' ? {} : { companyId };

    const items = await prisma.recurringInvoice.findMany({
      where: companyFilter,
      orderBy: { nextEmissionDate: 'asc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching recurring invoices:', error);
    return NextResponse.json({ error: 'Error al obtener facturas recurrentes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });

    const body = await req.json();
    const {
      customerName, customerId, customerDocument, customerTaxCondition, customerAddress,
      documentCode, invoiceType, pointOfSale, concept,
      items, subtotal, tax, total,
      frequency, dayOfMonth, startDate, endDate, observations
    } = body;

    if (!customerName || !items || !total) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Calculate next emission date
    const start = new Date(startDate || new Date());
    const day = dayOfMonth || start.getDate();
    let nextDate = new Date(start.getFullYear(), start.getMonth(), day);
    if (nextDate < new Date()) {
      // Move to next period
      nextDate = getNextDate(nextDate, frequency || 'monthly');
    }

    const recurring = await prisma.recurringInvoice.create({
      data: {
        companyId,
        customerId: customerId || null,
        customerName,
        customerDocument: customerDocument || null,
        customerTaxCondition: customerTaxCondition || 'consumidor_final',
        customerAddress: customerAddress || null,
        documentCode: documentCode || '006',
        invoiceType: invoiceType || 'B',
        pointOfSale: pointOfSale || 1,
        concept: concept || 2,
        items,
        subtotal: subtotal || 0,
        tax: tax || 0,
        total,
        frequency: frequency || 'monthly',
        dayOfMonth: day,
        nextEmissionDate: nextDate,
        startDate: start,
        endDate: endDate ? new Date(endDate) : null,
        observations: observations || null,
      },
    });

    return NextResponse.json(recurring, { status: 201 });
  } catch (error) {
    console.error('Error creating recurring invoice:', error);
    return NextResponse.json({ error: 'Error al crear factura recurrente' }, { status: 500 });
  }
}

function getNextDate(current: Date, frequency: string): Date {
  const d = new Date(current);
  switch (frequency) {
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'bimonthly': d.setMonth(d.getMonth() + 2); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'semiannual': d.setMonth(d.getMonth() + 6); break;
    case 'annual': d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1);
  }
  return d;
}
