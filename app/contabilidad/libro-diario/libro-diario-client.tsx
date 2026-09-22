'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/alegra/metric-card';

export function LibroDiarioClient() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/movements').then((r) => r.json()).catch(() => []),
      fetch('/api/sales?limit=30').then((r) => r.json()).catch(() => []),
      fetch('/api/journal-entries?limit=50').then((r) => r.json()).catch(() => []),
    ]).then(([movs, sales, journal]) => {
      const salesArr = Array.isArray(sales) ? sales : sales.sales || [];
      const journalArr = Array.isArray(journal) ? journal : [];

      const bankEntries = (Array.isArray(movs) ? movs : []).map((m: any) => ({
        date: m.date || m.createdAt,
        account: '1.1 Caja y Bancos',
        description: m.description || m.concept,
        debit: m.type === 'in' ? m.amount : 0,
        credit: m.type === 'out' ? m.amount : 0,
        source: 'banco',
      }));

      const saleEntries = salesArr.map((s: any) => ({
        date: s.createdAt,
        account: '4.1 Ventas',
        description: `Venta ${s.saleNumber}`,
        debit: 0,
        credit: s.total,
        source: 'venta',
      }));

      const manualEntries = journalArr.flatMap((entry: any) =>
        (entry.lines || []).map((line: any) => ({
          date: entry.date,
          account: `${line.accountCode} ${line.accountName}`,
          description: `${entry.entryNumber}: ${entry.description}`,
          debit: line.debit,
          credit: line.credit,
          source: 'asiento',
        })),
      );

      setEntries(
        [...bankEntries, ...saleEntries, ...manualEntries]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 150),
      );
      setLoading(false);
    });
  }, []);

  const fmt = (n: number) =>
    n ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n) : '—';

  return (
    <div>
      <PageHeader title="Libro diario" description="Registro cronológico de movimientos contables y operativos." />
      <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cuenta</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Debe</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Haber</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Sin asientos — registrá ventas, movimientos bancarios o asientos manuales</td></tr>
            ) : (
              entries.map((e, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(e.date).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3 text-teal-800 font-medium">{e.account}</td>
                  <td className="px-4 py-3 text-gray-600">{e.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(e.debit)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(e.credit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
