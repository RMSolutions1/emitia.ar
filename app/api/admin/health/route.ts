export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkIntegrations } from '@/lib/integrations-health';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const report = await checkIntegrations();
  const allOk = report.database.ok && report.afip.ok && report.ai.ok;

  return NextResponse.json({
    success: allOk,
    ...report,
  });
}
