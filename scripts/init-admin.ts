import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'superadmin@emitia.com.ar';
  const plain = process.env.ADMIN_PASSWORD || 'Emitia2026!';
  const password = await bcrypt.hash(plain, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: 'superadmin', status: 'active', name: 'Administrador EMITIA' },
    create: {
      name: 'Administrador EMITIA',
      email,
      password,
      role: 'superadmin',
      status: 'active',
    },
  });

  console.log('OK_ADMIN', admin.email, admin.role);
}

main()
  .catch((e) => {
    console.error('INIT_ADMIN_ERROR', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
