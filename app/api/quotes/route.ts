// @ts-nocheck
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (!isSuperadmin && companyId) {
      where.companyId = companyId;
    }
    if (status) where.status = status;

    const quotes = await prisma.quote.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats
    const allQuotes = await prisma.quote.findMany({
      where: !isSuperadmin && companyId ? { companyId } : {},
      select: { status: true, total: true },
    });
    const stats = {
      total: allQuotes.length,
      pending: allQuotes.filter(q => q.status === 'pending').length,
      approved: allQuotes.filter(q => q.status === 'approved').length,
      converted: allQuotes.filter(q => q.status === 'converted').length,
      totalValue: allQuotes.reduce((sum, q) => sum + (q.total || 0), 0),
    };

    return NextResponse.json({ quotes, stats });
  } catch (error) {
    console.error('Error al obtener presupuestos:', error);
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
    const { customerId, customerName, customerEmail, customerPhone, items, validDays, validUntil, notes, terms } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Debe agregar al menos un item' }, { status: 400 });
    }

    // Calculate subtotal, tax, total from items
    const calculatedSubtotal = items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice));
    }, 0);
    const taxRate = parseFloat(body.taxRate) || 21;
    const calculatedTax = calculatedSubtotal * (taxRate / 100);
    const calculatedDiscount = parseFloat(body.discount || 0);
    const calculatedTotal = calculatedSubtotal + calculatedTax - calculatedDiscount;

    // Use provided values or calculated ones
    const finalSubtotal = body.subtotal != null ? parseFloat(body.subtotal) : calculatedSubtotal;
    const finalTax = body.tax != null ? parseFloat(body.tax) : calculatedTax;
    const finalTotal = body.total != null ? parseFloat(body.total) : calculatedTotal;

    // Calculate validUntil from validDays or use provided date
    let finalValidUntil: Date;
    if (validUntil) {
      finalValidUntil = new Date(validUntil);
    } else {
      const days = parseInt(validDays) || 15;
      finalValidUntil = new Date();
      finalValidUntil.setDate(finalValidUntil.getDate() + days);
    }

    // Generar número de presupuesto
    const lastQuote = await prisma.quote.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    const nextNum = lastQuote ? parseInt(lastQuote.quoteNumber.split('-')[1] || '0') + 1 : 1;
    const quoteNumber = `P-${String(nextNum).padStart(5, '0')}`;

    const quote = await prisma.quote.create({
      data: {
        companyId,
        quoteNumber,
        customerId: customerId || null,
        customerName: customerName || 'Sin nombre',
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        subtotal: finalSubtotal,
        tax: finalTax,
        discount: calculatedDiscount,
        total: finalTotal,
        validUntil: finalValidUntil,
        notes: notes || null,
        terms: terms || null,
        status: 'pending',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            productName: item.productName || 'Producto',
            quantity: parseInt(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
            discount: parseFloat(item.discount || 0),
            subtotal: parseFloat(item.subtotal) || (parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0)),
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Error al crear presupuesto:', error);
    return NextResponse.json({ error: 'Error al crear presupuesto' }, { status: 500 });
  }
}
