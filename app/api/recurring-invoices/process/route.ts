import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  processDueRecurringInvoices,
  processRecurringInvoice,
} from '@/lib/recurring-invoice-processor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as { companyId?: string; role?: string };
    const body = await req.json().catch(() => ({}));
    const { id, processAll } = body as { id?: string; processAll?: boolean };

    if (id) {
      const result = await processRecurringInvoice(id);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (processAll) {
      const companyId = user.role === 'superadmin' ? undefined : user.companyId;
      const summary = await processDueRecurringInvoices(companyId);
      return NextResponse.json(summary);
    }

    return NextResponse.json({ error: 'Indicá id o processAll: true' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al procesar recurrentes';
    console.error('[Recurring Process]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
