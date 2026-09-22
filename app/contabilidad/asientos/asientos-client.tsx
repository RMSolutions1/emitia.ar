'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/alegra/metric-card';

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parentCode: string | null;
}

interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export function AsientosClient() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    accountCode: '',
    description: '',
    debit: '',
    credit: '',
    contraAccountCode: '',
  });

  useEffect(() => {
    fetch('/api/chart-accounts')
      .then((r) => r.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getAccountLabel = (code: string) => {
    const acc = accounts.find((a) => a.code === code);
    return acc ? `${acc.code} ${acc.name}` : code;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const debit = parseFloat(form.debit) || 0;
    const credit = parseFloat(form.credit) || 0;

    if (!form.accountCode || !form.contraAccountCode) {
      toast.error('Seleccioná cuenta y contrapartida');
      return;
    }
    if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)) {
      toast.error('Completá Debe o Haber (no ambos)');
      return;
    }

    const amount = debit > 0 ? debit : credit;
    const lines: JournalLine[] =
      debit > 0
        ? [
            { accountCode: form.accountCode, accountName: getAccountLabel(form.accountCode), debit: amount, credit: 0 },
            { accountCode: form.contraAccountCode, accountName: getAccountLabel(form.contraAccountCode), debit: 0, credit: amount },
          ]
        : [
            { accountCode: form.contraAccountCode, accountName: getAccountLabel(form.contraAccountCode), debit: amount, credit: 0 },
            { accountCode: form.accountCode, accountName: getAccountLabel(form.accountCode), debit: 0, credit: amount },
          ];

    setSaving(true);
    try {
      const res = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description, lines }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Asiento ${data.entryNumber} registrado`);
        setForm({ accountCode: '', description: '', debit: '', credit: '', contraAccountCode: '' });
      } else {
        toast.error(data.error || 'Error al registrar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const leafAccounts = accounts.filter((a) => a.code.includes('.'));

  return (
    <div>
      <PageHeader
        title="Asiento manual"
        description="Registrá movimientos contables con partida doble. Impactan en el libro diario."
      />
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
      ) : (
        <form onSubmit={submit} className="bg-white rounded-xl border shadow-sm p-6 max-w-xl space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Cuenta principal</label>
            <select
              value={form.accountCode}
              onChange={(e) => setForm({ ...form, accountCode: e.target.value })}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="">Seleccionar cuenta...</option>
              {leafAccounts.map((a) => (
                <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Contrapartida</label>
            <select
              value={form.contraAccountCode}
              onChange={(e) => setForm({ ...form, contraAccountCode: e.target.value })}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="">Seleccionar contrapartida...</option>
              {leafAccounts.filter((a) => a.code !== form.accountCode).map((a) => (
                <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Descripción</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500"
              placeholder="Ej: Ajuste de caja, gasto administrativo..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Debe ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.debit}
                onChange={(e) => setForm({ ...form, debit: e.target.value, credit: e.target.value ? '' : form.credit })}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Haber ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.credit}
                onChange={(e) => setForm({ ...form, credit: e.target.value, debit: e.target.value ? '' : form.debit })}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="0,00"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            Registrar asiento
          </button>
        </form>
      )}
    </div>
  );
}
