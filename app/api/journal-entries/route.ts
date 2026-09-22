import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const companyId = (session.user as { companyId?: string }).companyId;
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

    const entries = await prisma.journalEntry.findMany({
      where: { companyId },
      include: { lines: true },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error journal entries:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const companyId = (session.user as { companyId?: string }).companyId;
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 403 });

    const body = await req.json();
    const { date, description, reference, lines } = body;

    if (!description?.trim() || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json(
        { error: 'Descripción y al menos 2 líneas (debe/haber) requeridas' },
        { status: 400 },
      );
    }

    const totalDebit = lines.reduce((s: number, l: { debit?: number }) => s + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s: number, l: { credit?: number }) => s + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: 'El asiento debe cuadrar (Debe = Haber)' }, { status: 400 });
    }

    if (totalDebit <= 0) {
      return NextResponse.json({ error: 'El importe debe ser mayor a cero' }, { status: 400 });
    }

    const last = await prisma.journalEntry.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    const nextNum = last ? parseInt(last.entryNumber.split('-')[1] || '0', 10) + 1 : 1;
    const entryNumber = `AS-${String(nextNum).padStart(5, '0')}`;

    const entry = await prisma.journalEntry.create({
      data: {
        companyId,
        entryNumber,
        date: date ? new Date(date) : new Date(),
        description: description.trim(),
        reference: reference || null,
        lines: {
          create: lines.map((line: { accountCode: string; accountName: string; debit?: number; credit?: number }) => ({
            accountCode: line.accountCode,
            accountName: line.accountName,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
          })),
        },
      },
      include: { lines: true },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json({ error: 'Error al registrar asiento' }, { status: 500 });
  }
}
