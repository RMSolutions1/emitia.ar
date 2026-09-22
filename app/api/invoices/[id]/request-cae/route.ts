import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requestCAEForInvoice } from '@/lib/afip/request-cae-from-invoice';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const user = session.user as { companyId?: string; role?: string };

    const result = await requestCAEForInvoice(id, {
      companyId: user.companyId,
      role: user.role,
    });

    if (result.success) {
      return NextResponse.json(result);
    }

    return NextResponse.json(result, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al solicitar CAE';
    console.error('[Request CAE]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
