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
    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    const body = await request.json();
    const { commissionIds, sellerId, notes } = body;

    // Build where clause with company filter through seller relation
    const companyWhere = userRole === 'superadmin' ? {} : { seller: { companyId } };

    let whereClause: Record<string, unknown> = {};
    
    if (commissionIds && commissionIds.length > 0) {
      whereClause = { id: { in: commissionIds }, status: 'pending', ...companyWhere };
    } else if (sellerId) {
      // Verify seller belongs to company
      if (userRole !== 'superadmin') {
        const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
        if (!seller || seller.companyId !== companyId) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
      }
      whereClause = { sellerId, status: 'pending' };
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
