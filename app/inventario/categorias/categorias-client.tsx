'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Layers, Plus } from 'lucide-react';
import { PageHeader } from '@/components/alegra/metric-card';

export function CategoriasClient() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');

  const load = () => fetch('/api/categories').then((r) => r.json()).then(setCategories);
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      toast.success('Categoría creada');
      setName('');
      load();
    } else toast.error('Error al crear');
  };

  return (
    <div>
      <PageHeader title="Categorías" description="Organizá tus productos por categoría." />
      <form onSubmit={add} className="flex gap-2 mb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva categoría..." className="flex-1 max-w-sm border rounded-lg px-4 py-2 text-sm" />
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </form>
      <div className="grid gap-2">
        {categories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border"><Layers className="w-10 h-10 mx-auto mb-2 text-gray-300" /><p className="text-gray-500">Sin categorías</p></div>
        ) : categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4 bg-white rounded-xl border">
            <span className="font-medium">{c.name}</span>
            <span className="text-xs text-gray-400">{c.description || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
