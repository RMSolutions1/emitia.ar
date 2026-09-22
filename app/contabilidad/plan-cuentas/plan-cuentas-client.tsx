'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/alegra/metric-card';

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parentCode: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio Neto',
  ingreso: 'Ingresos',
  egreso: 'Egresos',
};

const TYPE_COLORS: Record<string, string> = {
  activo: 'bg-blue-50 text-blue-800 border-blue-100',
  pasivo: 'bg-amber-50 text-amber-800 border-amber-100',
  patrimonio: 'bg-violet-50 text-violet-800 border-violet-100',
  ingreso: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  egreso: 'bg-rose-50 text-rose-800 border-rose-100',
};

export function PlanCuentasClient() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'activo', parentCode: '' });

  const load = () => {
    fetch('/api/chart-accounts')
      .then((r) => r.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const groups = ['activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso'];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/chart-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Cuenta agregada');
        setShowForm(false);
        setForm({ code: '', name: '', type: 'activo', parentCode: '' });
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
        title="Plan de cuentas"
        description="Estructura contable para PyMEs argentinas. Personalizá y ampliá según tu negocio."
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nueva cuenta
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border p-4 mb-6 grid md:grid-cols-4 gap-3">
          <input
            placeholder="Código (ej: 5.4)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Nombre de cuenta"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
            required
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {groups.map((g) => (
              <option key={g} value={g}>{TYPE_LABELS[g]}</option>
            ))}
          </select>
          <button type="submit" className="md:col-span-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium">
            Guardar cuenta
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
      ) : (
        <div className="space-y-4">
          {groups.map((type) => {
            const groupAccounts = accounts.filter((a) => a.type === type);
            if (groupAccounts.length === 0) return null;
            const root = groupAccounts.find((a) => !a.parentCode || !a.code.includes('.'));
            return (
              <div key={type} className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <div className={`px-4 py-3 border-b font-semibold ${TYPE_COLORS[type] || 'bg-gray-50'}`}>
                  {root ? `${root.code} — ${root.name}` : TYPE_LABELS[type]}
                </div>
                <ul className="divide-y divide-gray-100">
                  {groupAccounts
                    .filter((a) => a.code.includes('.'))
                    .map((a) => (
                      <li key={a.id} className="px-4 py-3 text-sm text-gray-700 flex justify-between">
                        <span><span className="font-mono text-teal-700 mr-2">{a.code}</span>{a.name}</span>
                      </li>
                    ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
