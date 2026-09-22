import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const IN_TYPES = new Set(['deposit', 'transfer_in', 'interest']);
const OUT_TYPES = new Set(['withdrawal', 'transfer_out', 'fee']);

function normalizeType(raw: string): 'in' | 'out' {
  if (IN_TYPES.has(raw)) return 'in';
  if (OUT_TYPES.has(raw)) return 'out';
  return raw === 'in' ? 'in' : 'out';
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { getTenantFromRequest, tenantWhere } = await import('@/lib/tenant');
    const tenant = getTenantFromRequest(session, request);
    if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const scoped = tenantWhere(tenant);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.where.companyId;
    const isSuperadmin = false;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const bankAccountId = searchParams.get('bankAccountId');

    const accounts = await prisma.bankAccount.findMany({
      where: {
        ...(isSuperadmin ? {} : { companyId }),
        ...(bankAccountId ? { id: bankAccountId } : {}),
        isActive: true,
      },
      select: { id: true, bankName: true, accountNumber: true },
    });

    if (accounts.length === 0) {
      return NextResponse.json([]);
    }

    const accountIds = accounts.map((a) => a.id);
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    const movements = await prisma.bankMovement.findMany({
      where: {
        bankAccountId: { in: accountIds },
        ...(from && { date: { gte: new Date(from) } }),
        ...(to && { date: { lte: new Date(to) } }),
      },
      orderBy: { date: 'desc' },
      take: 500,
    });

    const normalized = movements.map((m) => {
      const account = accountMap.get(m.bankAccountId);
      return {
        id: m.id,
        bankAccountId: m.bankAccountId,
        bankName: account?.bankName ?? null,
        accountNumber: account?.accountNumber ?? null,
        date: m.date.toISOString(),
        createdAt: m.createdAt.toISOString(),
        concept: m.concept,
        description: m.description ?? m.concept,
        amount: m.amount,
        balance: m.balance,
        reference: m.reference,
        reconciled: m.reconciled,
        rawType: m.type,
        type: normalizeType(m.type),
      };
    });

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 });
  }
}
