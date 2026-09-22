import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const isSuperadmin = (session.user as any).role === 'superadmin';

    const where: any = {};
    if (!isSuperadmin && companyId) {
      where.companyId = companyId;
    }

    const priceLists = await prisma.priceList.findMany({
      where,
      include: { items: true, _count: { select: { customers: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(priceLists);
  } catch (error) {
    console.error('Error:', error);
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
    const { name, description, currency, isDefault, items } = body;

    const priceList = await prisma.priceList.create({
      data: {
        companyId,
        name,
        description,
        currency: currency || 'ARS',
        isDefault: isDefault || false,
        items: items ? { create: items } : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json(priceList, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
