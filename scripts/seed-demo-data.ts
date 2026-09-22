/**
 * Seed datos demo para empresa activa (productos, banco, categoría).
 * Uso VPS: npx tsx scripts/seed-demo-data.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PRODUCTS = [
  { name: 'Servicio de consultoría', sku: 'SRV-001', price: 45000, cost: 0, stock: 999 },
  { name: 'Licencia EMITIA mensual', sku: 'LIC-001', price: 15000, cost: 5000, stock: 999 },
  { name: 'Producto demo A', sku: 'PROD-A', price: 8500, cost: 4200, stock: 120 },
  { name: 'Producto demo B', sku: 'PROD-B', price: 12300, cost: 6100, stock: 85 },
  { name: 'Producto demo C', sku: 'PROD-C', price: 5600, cost: 2800, stock: 200 },
];

async function main() {
  const company = await prisma.company.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'asc' },
  });

  if (!company) {
    console.error('No hay empresa activa');
    process.exit(1);
  }

  console.log(`Seeding empresa: ${company.name} (${company.id})`);

  let category = await prisma.category.findFirst({ where: { companyId: company.id } });
  if (!category) {
    category = await prisma.category.create({
      data: { companyId: company.id, name: 'General', description: 'Categoría principal' },
    });
    console.log('✓ Categoría General');
  }

  let createdProducts = 0;
  for (const p of DEMO_PRODUCTS) {
    const exists = await prisma.product.findFirst({
      where: { companyId: company.id, sku: p.sku },
    });
    if (!exists) {
      await prisma.product.create({
        data: { companyId: company.id, categoryId: category.id, ...p, active: true },
      });
      createdProducts++;
    }
  }
  console.log(`✓ Productos: ${createdProducts} nuevos`);

  const bankCount = await prisma.bankAccount.count({ where: { companyId: company.id } });
  if (bankCount === 0) {
    await prisma.bankAccount.create({
      data: {
        companyId: company.id,
        bankName: 'Banco Galicia',
        accountNumber: '0000123456789012345678',
        cbu: '0070123456789012345678',
        alias: 'emitia.demo',
        accountType: 'checking',
        currency: 'ARS',
        balance: 250000,
      },
    });
    console.log('✓ Cuenta bancaria demo');
  }

  const whCount = await prisma.warehouse.count({ where: { companyId: company.id } });
  if (whCount === 0) {
    await prisma.warehouse.create({
      data: {
        companyId: company.id,
        name: 'Depósito Principal',
        code: 'DEP-01',
        isDefault: true,
      },
    });
    console.log('✓ Depósito principal');
  }

  console.log('\nSeed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
