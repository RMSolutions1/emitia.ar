import prisma from './db';

export type PublicStats = {
  comprobantes: number;
  empresasActivas: number;
  facturadoTotal: number;
};

/** Mínimos para mostrar métricas en la landing sin parecer infladas. */
export const PUBLIC_STATS_THRESHOLDS = {
  comprobantes: 100,
  empresasActivas: 10,
  facturadoTotal: 1_000_000,
} as const;

export function shouldShowPublicStats(stats: PublicStats): boolean {
  return (
    stats.comprobantes >= PUBLIC_STATS_THRESHOLDS.comprobantes ||
    stats.empresasActivas >= PUBLIC_STATS_THRESHOLDS.empresasActivas ||
    stats.facturadoTotal >= PUBLIC_STATS_THRESHOLDS.facturadoTotal
  );
}

export async function getPublicStats(): Promise<PublicStats> {
  const [invoices, tickets, companies, invoiceSum] = await Promise.all([
    prisma.invoice.count(),
    prisma.ticket.count(),
    prisma.company.count({
      where: { status: { notIn: ['blocked', 'suspended'] } },
    }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ['cancelled', 'draft'] } },
    }),
  ]);

  return {
    comprobantes: invoices + tickets,
    empresasActivas: companies,
    facturadoTotal: invoiceSum._sum.total ?? 0,
  };
}
