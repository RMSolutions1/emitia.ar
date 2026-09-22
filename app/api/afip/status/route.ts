export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkServerStatus } from '@/lib/afip';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const status = await checkServerStatus();
    
    return NextResponse.json({
      success: true,
      status,
      environment: process.env.AFIP_ENVIRONMENT || 'testing',
      configured: !!(process.env.AFIP_CERT && process.env.AFIP_KEY && process.env.AFIP_CUIT),
    });
  } catch (error: any) {
    console.error('[AFIP Status Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al verificar estado de AFIP',
      configured: !!(process.env.AFIP_CERT && process.env.AFIP_KEY && process.env.AFIP_CUIT),
    }, { status: 500 });
  }
}
