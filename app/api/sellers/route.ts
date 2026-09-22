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

    const where: any = { isActive: true };
    if (!isSuperadmin && companyId) {
      where.companyId = companyId;
    }

    const sellers = await prisma.seller.findMany({
      where,
      include: { _count: { select: { commissions: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(sellers);
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
    const { name, email, phone, document, commissionRate, fixedCommission, userId } = body;

    const seller = await prisma.seller.create({
      data: {
        companyId,
        name,
        email,
        phone,
        document,
        commissionRate: parseFloat(commissionRate || 0),
        fixedCommission: parseFloat(fixedCommission || 0),
        userId,
      },
    });

    return NextResponse.json(seller, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
