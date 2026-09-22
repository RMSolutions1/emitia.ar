export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { consultVoucher, getCompanyCuit } from '@/lib/afip';

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
    const nroComprobante = parseInt(searchParams.get('cbteNro') || '0');

    if (!nroComprobante) {
      return NextResponse.json({ error: 'Número de comprobante requerido' }, { status: 400 });
    }

    const result = await consultVoucher(puntoVenta, tipoComprobante, nroComprobante, companyCuit);

    return NextResponse.json({
      success: true,
      comprobante: result,
    });
  } catch (error: any) {
    console.error('[AFIP Consult Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al consultar comprobante',
    }, { status: 500 });
  }
}
