'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Contact, Users, Building2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/alegra/metric-card';

type Tab = 'all' | 'clients' | 'suppliers';

export function ContactosClient() {
  const [tab, setTab] = useState<Tab>('all');
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/customers'), fetch('/api/suppliers')])
      .then(async ([c, s]) => {
        const custData = await c.json();
        const supData = await s.json();
        setCustomers(Array.isArray(custData) ? custData : custData.customers || []);
        setSuppliers(Array.isArray(supData) ? supData : supData.suppliers || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const all = [
    ...customers.map((c) => ({ ...c, type: 'cliente' as const })),
    ...suppliers.map((s) => ({ ...s, type: 'proveedor' as const })),
  ].filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()));

  const list =
    tab === 'clients' ? all.filter((c) => c.type === 'cliente') :
    tab === 'suppliers' ? all.filter((c) => c.type === 'proveedor') : all;

  return (
    <div>
      <PageHeader
        title="Contactos"
        description="Clientes y proveedores en un solo lugar."
        actions={
          <div className="flex gap-2">
            <Link href="/clientes" className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <Plus className="w-4 h-4" /> Cliente
            </Link>
            <Link href="/proveedores" className="inline-flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">
              <Plus className="w-4 h-4" /> Proveedor
            </Link>
          </div>
        }
      />
      <div className="flex gap-2 mb-4">
        {(['all', 'clients', 'suppliers'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === t ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {t === 'all' ? 'Todos' : t === 'clients' ? 'Clientes' : 'Proveedores'}
          </button>
        ))}
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar contacto..."
        className="w-full max-w-md mb-4 px-4 py-2 border border-gray-200 rounded-lg text-sm"
      />
      <div className="grid gap-2">
        {loading ? (
          <p className="text-gray-400 py-12 text-center">Cargando...</p>
        ) : list.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Contact className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500">Sin contactos</p>
          </div>
        ) : (
          list.map((c) => (
            <Link
              key={`${c.type}-${c.id}`}
              href={c.type === 'cliente' ? '/clientes' : '/proveedores'}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-teal-300"
            >
              <div className={`p-2 rounded-lg ${c.type === 'cliente' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                {c.type === 'cliente' ? (
                  <Users className="w-5 h-5 text-blue-600" />
                ) : (
                  <Building2 className="w-5 h-5 text-orange-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500 capitalize">{c.type} · {c.document || c.email || '—'}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
