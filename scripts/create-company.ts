import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const cuit = '20401546228';

  let company = await prisma.company.findUnique({ where: { cuit } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'GRUPO EMPRENOR',
        legalName: 'GRUPO EMPRENOR',
        cuit,
        condicionIva: 'responsable_inscripto',
        city: 'Salta',
        province: 'Salta',
        currency: 'ARS',
        taxRate: 21,
        invoicePrefix: 'FAC',
        defaultPOS: 6,
        afipEnvironment: 'production',
        plan: 'empresa',
        status: 'active',
        maxUsers: 10,
        maxPOS: 5,
      },
    });
    console.log('COMPANY_CREATED', company.id, company.name);
  } else {
    console.log('COMPANY_EXISTS', company.id, company.name);
  }

  const email = process.env.COMPANY_ADMIN_EMAIL || 'admin@emitia.com.ar';
  const plain = process.env.COMPANY_ADMIN_PASSWORD || 'Emitia2026!';
  const password = await bcrypt.hash(plain, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'company_admin', status: 'active', companyId: company.id },
    create: {
      name: 'Administrador GRUPO EMPRENOR',
      email,
      password,
      role: 'company_admin',
      status: 'active',
      companyId: company.id,
    },
  });
  console.log('COMPANY_ADMIN_OK', user.email, '-> company', company.name);
}

main()
  .catch((e) => {
    console.error('CREATE_COMPANY_ERROR', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
