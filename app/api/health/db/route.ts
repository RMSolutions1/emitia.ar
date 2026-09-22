import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    return NextResponse.json({ ok: true, latencyMs: Date.now() - start, users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error de conexión';
    const isTimeout = message.includes('Timed out') || message.includes('connection pool');
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - start,
        error: isTimeout
          ? 'No se puede conectar a la base de datos. Verificá tu conexión o usá PostgreSQL local (npm run db:local).'
          : message.slice(0, 200),
      },
      { status: 503 }
    );
  }
}
