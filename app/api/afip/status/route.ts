export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkServerStatus } from '@/lib/afip';
import { getTenantFromRequest, tenantWhere } from '@/lib/tenant';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenant = getTenantFromRequest(session, req);
    if (!tenant) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const scoped = tenantWhere(tenant);
    const company = scoped.ok
      ? await prisma.company.findUnique({
          where: { id: scoped.where.companyId },
          select: { cuit: true, defaultPOS: true, afipEnvironment: true },
        })
      : null;

    const status = await checkServerStatus();
    const companyCuit = (company?.cuit || '').replace(/\D/g, '');
    
    return NextResponse.json({
      success: true,
      status,
      environment: company?.afipEnvironment || process.env.AFIP_ENVIRONMENT || 'testing',
      configured: !!(process.env.AFIP_CERT && process.env.AFIP_KEY) && companyCuit.length === 11,
      companyCuit: companyCuit.length === 11 ? companyCuit : null,
      defaultPOS: company?.defaultPOS || null,
      needsCompany: !scoped.ok,
    });
  } catch (error: any) {
    console.error('[AFIP Status Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al verificar estado de AFIP',
      configured: false,
    }, { status: 500 });
  }
}
