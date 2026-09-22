export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTicketAcceso, getAFIPCredentials } from '@/lib/afip';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { certPem, keyPem, cuit, environment } = getAFIPCredentials();
    
    // Test wsfe authentication
    const ticketWSFE = await getTicketAcceso('wsfe', certPem, keyPem, environment);
    
    // Also test ws_sr_padron_a13 authentication
    let padronOk = false;
    let padronError = '';
    try {
      await getTicketAcceso('ws_sr_padron_a13', certPem, keyPem, environment);
      padronOk = true;
    } catch (e: any) {
      padronError = e.message || String(e);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Autenticación exitosa con ARCA',
      expirationTime: ticketWSFE.expirationTime,
      generationTime: ticketWSFE.generationTime,
      environment,
      cuit,
      services: {
        wsfe: true,
        ws_sr_padron_a13: padronOk,
        ...(padronError ? { padronError } : {}),
      },
    });
  } catch (error: any) {
    console.error('[AFIP Auth Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al autenticar con AFIP',
    }, { status: 500 });
  }
}
