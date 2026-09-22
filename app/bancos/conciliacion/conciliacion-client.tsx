'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Scale } from 'lucide-react';
import { PageHeader } from '@/components/alegra/metric-card';

export function ConciliacionClient() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/bank-accounts').then((r) => r.json()).then(setAccounts);
    fetch('/api/movements').then((r) => r.json()).then(setMovements);
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

  return (
    <div>
      <PageHeader
        title="Conciliaciones bancarias"
        description="Compará movimientos del sistema con extractos bancarios."
        actions={
          <Link href="/tesoreria" className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            Ir a bancos
          </Link>
        }
      />
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {accounts.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border p-4">
            <p className="font-medium">{a.bankName || a.alias || 'Cuenta bancaria'}</p>
            <p className="text-2xl font-bold text-teal-700 mt-1">{fmt(a.balance || 0)}</p>
            <p className="text-xs text-gray-500">{a.accountNumber}{a.accountType ? ` · ${a.accountType}` : ''}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Descripción</th>
              <th className="text-right px-4 py-3">Importe</th>
              <th className="text-center px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400"><Scale className="w-10 h-10 mx-auto mb-2 opacity-40" />Sin movimientos</td></tr>
            ) : (
              movements.slice(0, 50).map((m: any) => (
                <tr key={m.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{new Date(m.date || m.createdAt).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3">{m.description || m.concept}</td>
                  <td className={`px-4 py-3 text-right font-medium ${m.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.type === 'in' ? '+' : '-'}{fmt(Math.abs(m.amount))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">Pendiente</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
