export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEnabledVoucherTypes, getPointsOfSale, getCompanyCuit } from '@/lib/afip';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const companyCuit = await getCompanyCuit(companyId);

    const [voucherTypes, pointsOfSale] = await Promise.all([
      getEnabledVoucherTypes(companyCuit),
      getPointsOfSale(companyCuit),
    ]);

    return NextResponse.json({
      success: true,
      voucherTypes,
      pointsOfSale,
    });
  } catch (error: any) {
    console.error('[AFIP Voucher Types Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener tipos de comprobante',
    }, { status: 500 });
  }
}
