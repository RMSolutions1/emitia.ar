'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleDollarSign, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/alegra/metric-card';
import toast from 'react-hot-toast';

interface PaymentOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  date: string;
  totalAmount: number;
  status: string;
}

export function PagosClient() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/payment-orders')
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => toast.error('Error al cargar pagos'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

  const filtered = orders.filter(
    (o) =>
      o.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Pagos"
        description="Pagos realizados a proveedores."
        actions={
          <Link
            href="/proveedores"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Registrar pago
          </Link>
        }
      />
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proveedor..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nº Pago</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Importe</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  <CircleDollarSign className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  Sin pagos registrados
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-teal-700">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.supplierName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(o.date).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(o.totalAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
