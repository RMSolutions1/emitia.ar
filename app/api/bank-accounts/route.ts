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

    const accounts = await prisma.bankAccount.findMany({
      where,
      orderBy: { bankName: 'asc' },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error al obtener cuentas bancarias:', error);
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
    const { bankName, accountNumber, cbu, alias, accountType, currency, balance, notes } = body;

    const account = await prisma.bankAccount.create({
      data: {
        companyId,
        bankName,
        accountNumber,
        cbu,
        alias,
        accountType,
        currency: currency || 'ARS',
        balance: parseFloat(balance || 0),
        notes,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Error al crear cuenta bancaria:', error);
    return NextResponse.json({ error: 'Error al crear cuenta bancaria' }, { status: 500 });
  }
}
