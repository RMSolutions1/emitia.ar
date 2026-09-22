'use client';

import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { PageHeader } from '@/components/alegra/metric-card';

export function ValorInventarioClient() {
  const [data, setData] = useState<{ lines: any[]; totals: any } | null>(null);

  useEffect(() => {
    fetch('/api/inventory/value').then((r) => r.json()).then(setData);
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

  return (
    <div>
      <PageHeader title="Valor de inventario" description="Valorización de stock al costo y al precio de venta." />
      {data?.totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Productos</p>
            <p className="text-2xl font-bold">{data.totals.productCount}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Unidades</p>
            <p className="text-2xl font-bold">{data.totals.totalUnits}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Valor costo</p>
            <p className="text-2xl font-bold text-teal-700">{fmt(data.totals.totalCost)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Valor venta</p>
            <p className="text-2xl font-bold">{fmt(data.totals.totalPrice)}</p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">Producto</th>
              <th className="text-right px-4 py-3">Stock</th>
              <th className="text-right px-4 py-3">Costo unit.</th>
              <th className="text-right px-4 py-3">Valor costo</th>
              <th className="text-right px-4 py-3">Valor venta</th>
            </tr>
          </thead>
          <tbody>
            {!data?.lines?.length ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400"><Scale className="w-10 h-10 mx-auto mb-2 opacity-40" />Sin datos</td></tr>
            ) : (
              data.lines.map((l) => (
                <tr key={l.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{l.name}<span className="text-xs text-gray-400 ml-2">{l.sku}</span></td>
                  <td className="px-4 py-3 text-right">{l.stock}</td>
                  <td className="px-4 py-3 text-right">{fmt(l.cost)}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(l.valueCost)}</td>
                  <td className="px-4 py-3 text-right">{fmt(l.valuePrice)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
