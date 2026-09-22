import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const { default: prisma } = await import('../lib/db');
  const start = Date.now();
  try {
    const users = await prisma.user.findMany({
      select: { email: true, role: true, status: true },
      take: 5,
    });
    console.log(`OK (${Date.now() - start}ms) — ${users.length} usuarios:`);
    users.forEach((u) => console.log(`  - ${u.email} (${u.role}, ${u.status})`));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`FALLO (${Date.now() - start}ms):`, msg.slice(0, 400));
  } finally {
    await prisma.$disconnect();
  }
}

main();
