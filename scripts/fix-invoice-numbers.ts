import prisma from '../lib/db';

async function main() {
  const nums = ['0006-00000005', '0006-00000006', '0006-00000010'];
  for (const invoiceNumber of nums) {
    const r = await prisma.invoice.updateMany({
      where: { invoiceNumber },
      data: {
        customerTaxCondition: 'responsable_inscripto',
        customerAddress: 'Salta',
      },
    });
    console.log(`${invoiceNumber}: ${r.count}`);
  }
}

main()
  .finally(() => prisma.$disconnect());
