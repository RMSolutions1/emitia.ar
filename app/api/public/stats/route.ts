import { NextResponse } from 'next/server';
import { getPublicStats } from '@/lib/get-public-stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getPublicStats();
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[public/stats] Error:', error);
    return NextResponse.json({ error: 'No se pudieron obtener estadísticas' }, { status: 503 });
  }
}
