'use client';

import { useEffect, useState } from 'react';
import { Warehouse, Plus, MapPin, Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/alegra/metric-card';

interface WarehouseRow {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  isDefault: boolean;
  isActive: boolean;
}

export function DepositosClient() {
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [totals, setTotals] = useState({ productCount: 0, totalUnits: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '' });

  const load = () => {
    fetch('/api/warehouses')
      .then((r) => r.json())
      .then((d) => {
        setWarehouses(d.warehouses || []);
        setTotals(d.totals || { productCount: 0, totalUnits: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Depósito creado');
        setShowForm(false);
        setForm({ name: '', code: '', address: '', city: '' });
        load();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  return (
    <div>
      <PageHeader
        title="Depósitos"
        description="Centros de almacenamiento y control de stock."
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo depósito
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border p-4 mb-6 grid md:grid-cols-2 gap-3">
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" required />
          <input placeholder="Código (opcional)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="md:col-span-2 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium">Crear depósito</button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div key={w.id} className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-teal-50 rounded-xl shrink-0">
                  <Warehouse className="w-7 h-7 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg truncate">{w.name}</h3>
                    {w.isDefault && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3" /> Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{w.code}</p>
                  {(w.address || w.city) && (
                    <p className="text-sm text-gray-600 mt-2 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {[w.address, w.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t">
                <div>
                  <p className="text-xs text-gray-500">Productos</p>
                  <p className="text-xl font-bold text-gray-900">{totals.productCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Unidades</p>
                  <p className="text-xl font-bold text-teal-700">{totals.totalUnits.toLocaleString('es-AR')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
