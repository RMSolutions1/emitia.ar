import { NextRequest, NextResponse } from 'next/server';
import { processDueRecurringInvoices } from '@/lib/recurring-invoice-processor';

export const dynamic = 'force-dynamic';

/** Cron diario: GET /api/cron/recurring-invoices?secret=CRON_SECRET */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const summary = await processDueRecurringInvoices();
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error en cron';
    console.error('[Cron Recurring]', error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
