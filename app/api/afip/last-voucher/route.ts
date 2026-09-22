export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLastAuthorizedVoucher, getCompanyCuit } from '@/lib/afip';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const companyCuit = await getCompanyCuit(companyId);

    const { searchParams } = new URL(request.url);
    const puntoVenta = parseInt(searchParams.get('ptoVta') || '1');
    const tipoComprobante = parseInt(searchParams.get('cbteTipo') || '11');

    const lastNumber = await getLastAuthorizedVoucher(puntoVenta, tipoComprobante, companyCuit);

    return NextResponse.json({
      success: true,
      puntoVenta,
      tipoComprobante,
      ultimoAutorizado: lastNumber,
      siguienteNumero: lastNumber + 1,
    });
  } catch (error: any) {
    console.error('[AFIP Last Voucher Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al consultar último comprobante',
    }, { status: 500 });
  }
}
