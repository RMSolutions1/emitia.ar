import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Pagar comisiones
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { requireTenant } = await import('@/lib/tenant');
    const scoped = requireTenant(session, request);
    if (!scoped.ok) return scoped.response;
    const companyId = scoped.companyId;

    const body = await request.json();
    const { commissionIds, sellerId, notes } = body;

    const companyWhere = { seller: scoped.where };

    let whereClause: Record<string, unknown> = {};
    
    if (commissionIds && commissionIds.length > 0) {
      whereClause = { id: { in: commissionIds }, status: 'pending', ...companyWhere };
    } else if (sellerId) {
      const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
      if (!seller || seller.companyId !== companyId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      whereClause = { sellerId, status: 'pending', ...companyWhere };
    } else {
      return NextResponse.json({ error: 'Debe especificar comisiones o vendedor' }, { status: 400 });
    }

    const result = await prisma.commission.updateMany({
      where: whereClause,
      data: {
        status: 'paid',
        paidAt: new Date(),
        notes,
      },
    });

    return NextResponse.json({ 
      success: true, 
      paidCount: result.count,
      message: `Se pagaron ${result.count} comisiones` 
    });
  } catch (error) {
    console.error('Error paying commissions:', error);
    return NextResponse.json({ error: 'Error al pagar comisiones' }, { status: 500 });
  }
}
