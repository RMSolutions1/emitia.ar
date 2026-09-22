'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/alegra/metric-card';

export function AjustesClient() {
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch('/api/products').then((r) => r.json()).then(setProducts);
    fetch('/api/inventory/adjustments').then((r) => r.json()).then(setMovements);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !newStock) return;
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, type: 'adjustment', quantity: parseInt(newStock, 10), reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Stock ajustado');
      setNewStock('');
      setReason('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Ajustes de inventario" description="Corregí cantidades de stock manualmente." />
      <form onSubmit={submit} className="bg-white rounded-xl border p-6 mb-6 grid md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Producto</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required>
            <option value="">Seleccionar...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Nuevo stock</label>
          <input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required min={0} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Motivo</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Conteo físico..." />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={loading} className="w-full py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Ajustar stock'}
          </button>
        </div>
      </form>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">Producto</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-right px-4 py-3">Cantidad</th>
              <th className="text-left px-4 py-3">Motivo</th>
              <th className="text-left px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400"><SlidersHorizontal className="w-10 h-10 mx-auto mb-2 opacity-40" />Sin movimientos</td></tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{m.product?.name}</td>
                  <td className="px-4 py-3 capitalize">{m.type}</td>
                  <td className="px-4 py-3 text-right">{m.quantity}</td>
                  <td className="px-4 py-3 text-gray-500">{m.reason || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(m.createdAt).toLocaleDateString('es-AR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
