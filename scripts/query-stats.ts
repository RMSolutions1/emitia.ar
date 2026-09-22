import prisma from '../lib/db';

async function main() {
  const [invoices, tickets, companies, invoiceSum, users] = await Promise.all([
    prisma.invoice.count(),
    prisma.ticket.count(),
    prisma.company.count({ where: { status: { notIn: ['blocked', 'suspended'] } } }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ['cancelled', 'draft'] } },
    }),
    prisma.user.count({ where: { status: 'active' } }),
  ]);

  const comprobantes = invoices + tickets;
  const facturadoTotal = invoiceSum._sum.total ?? 0;
  const facturadoMillones = Math.max(1, Math.round(facturadoTotal / 1_000_000));

  console.log(
    JSON.stringify(
      {
        comprobantes,
        empresasActivas: companies,
        facturadoTotal,
        facturadoMillones,
        usuariosActivos: users,
        uptime: 99.9,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
