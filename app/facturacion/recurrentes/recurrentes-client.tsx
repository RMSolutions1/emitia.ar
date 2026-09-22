'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, RefreshCw, Pause, Play, Trash2, Edit3, Calendar,
  FileText, Users, DollarSign, Clock, AlertCircle, CheckCircle2,
  X, ChevronRight, Repeat
} from 'lucide-react';
import toast from 'react-hot-toast';

interface RecurringInvoice {
  id: string;
  customerName: string;
  customerDocument: string | null;
  customerTaxCondition: string;
  customerAddress: string | null;
  documentCode: string;
  invoiceType: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  frequency: string;
  dayOfMonth: number;
  nextEmissionDate: string;
  lastEmissionDate: string | null;
  startDate: string;
  endDate: string | null;
  observations: string | null;
  isActive: boolean;
  totalEmitted: number;
  createdAt: string;
}

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const fmt = (v: number) => '$' + v.toLocaleString('es-AR', { minimumFractionDigits: 2 });

export default function RecurrentesClient() {
  const [invoices, setInvoices] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emittingId, setEmittingId] = useState<string | null>(null);
  const [processingAll, setProcessingAll] = useState(false);
  const router = useRouter();

  // Form state
  const [form, setForm] = useState({
    customerName: '',
    customerDocument: '',
    customerTaxCondition: 'consumidor_final',
    customerAddress: '',
    invoiceType: 'B',
    documentCode: '006',
    frequency: 'monthly',
    dayOfMonth: 1,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    observations: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, ivaRate: 21 }] as Array<{ description: string; quantity: number; unitPrice: number; ivaRate: number }>,
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/recurring-invoices');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, ivaRate: 21 }],
    }));
  };

  const removeItem = (idx: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const calcTotals = () => {
    let subtotal = 0;
    let tax = 0;
    form.items.forEach(item => {
      const itemSub = item.quantity * item.unitPrice;
      subtotal += itemSub;
      tax += itemSub * (item.ivaRate / 100);
    });
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleCreate = async () => {
    if (!form.customerName.trim()) {
      toast.error('Ingresá el nombre del cliente');
      return;
    }
    if (form.items.some(i => !i.description.trim() || i.unitPrice <= 0)) {
      toast.error('Completá todos los items con descripción y precio');
      return;
    }

    setSaving(true);
    try {
      const { subtotal, tax, total } = calcTotals();
      const res = await fetch('/api/recurring-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          subtotal,
          tax,
          total,
        }),
      });

      if (res.ok) {
        toast.success('Factura recurrente creada');
        setShowCreateModal(false);
        resetForm();
        fetchInvoices();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al crear');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/recurring-invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
      if (res.ok) {
        fetchInvoices();
        toast.success('Estado actualizado');
      }
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta factura recurrente?')) return;
    try {
      const res = await fetch(`/api/recurring-invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInvoices();
        toast.success('Eliminada');
      }
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleEmitNow = async (id: string) => {
    setEmittingId(id);
    try {
      const res = await fetch('/api/recurring-invoices/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Factura emitida con CAE: ${data.cae}`);
        fetchInvoices();
      } else {
        toast.error(data.error || 'No se pudo emitir con CAE', { duration: 8000 });
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setEmittingId(null);
    }
  };

  const handleProcessAllDue = async () => {
    setProcessingAll(true);
    try {
      const res = await fetch('/api/recurring-invoices/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processAll: true }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Procesadas: ${data.success} OK, ${data.failed} con error`);
        fetchInvoices();
      } else {
        toast.error(data.error || 'Error al procesar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setProcessingAll(false);
    }
  };

  const resetForm = () => {
    setForm({
      customerName: '',
      customerDocument: '',
      customerTaxCondition: 'consumidor_final',
      customerAddress: '',
      invoiceType: 'B',
      documentCode: '006',
      frequency: 'monthly',
      dayOfMonth: 1,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      observations: '',
      items: [{ description: '', quantity: 1, unitPrice: 0, ivaRate: 21 }],
    });
  };

  const activeCount = invoices.filter(i => i.isActive).length;
  const monthlyTotal = invoices.filter(i => i.isActive).reduce((s, i) => s + i.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Repeat className="w-7 h-7 text-indigo-600" />
            Facturación Recurrente
          </h1>
          <p className="text-sm text-gray-500 mt-1">Programá facturas automáticas para servicios periódicos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleProcessAllDue}
            disabled={processingAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${processingAll ? 'animate-spin' : ''}`} />
            Emitir vencidas
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nueva Recurrente
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[11px] text-gray-500 font-medium">Total Programadas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[11px] text-gray-500 font-medium">Activas</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[11px] text-gray-500 font-medium">Pausadas</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{invoices.length - activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[11px] text-gray-500 font-medium">Ingreso Mensual Est.</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{fmt(monthlyTotal)}</p>
        </div>
      </div>

      {/* List */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <Repeat className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Sin facturas recurrentes</h3>
          <p className="text-sm text-gray-500 mb-4">Creá tu primera factura recurrente para cobrar automáticamente a tus clientes</p>
          <button onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4 inline mr-1" /> Crear primera recurrente
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const nextDate = new Date(inv.nextEmissionDate);
            const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div key={inv.id} className={`bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                inv.isActive ? 'border-gray-100' : 'border-amber-200 bg-amber-50/30'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        inv.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.isActive ? 'ACTIVA' : 'PAUSADA'}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 rounded-full">
                        {FREQ_LABELS[inv.frequency] || inv.frequency}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">
                        Factura {inv.invoiceType}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{inv.customerName}</p>
                    {inv.customerDocument && (
                      <p className="text-[11px] text-gray-400">CUIT: {inv.customerDocument}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{fmt(inv.total)}</p>
                    <p className="text-[11px] text-gray-400">
                      {(inv.items as any[])?.length || 0} item{(inv.items as any[])?.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Next date */}
                  <div className="text-right sm:text-center">
                    <p className="text-xs text-gray-500">Próxima emisión</p>
                    <p className={`text-sm font-semibold ${
                      daysUntil <= 3 ? 'text-red-600' : daysUntil <= 7 ? 'text-amber-600' : 'text-gray-700'
                    }`}>
                      {nextDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                    {inv.isActive && (
                      <p className="text-[10px] text-gray-400">
                        {daysUntil <= 0 ? 'Hoy' : `en ${daysUntil} día${daysUntil > 1 ? 's' : ''}`}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {inv.isActive && (
                      <button
                        onClick={() => handleEmitNow(inv.id)}
                        disabled={emittingId === inv.id}
                        title="Emitir ahora con CAE"
                        className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-50"
                      >
                        {emittingId === inv.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button onClick={() => toggleActive(inv.id)} title={inv.isActive ? 'Pausar' : 'Activar'}
                      className={`p-2 rounded-lg transition-colors ${
                        inv.isActive 
                          ? 'text-amber-600 hover:bg-amber-50' 
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}>
                      {inv.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(inv.id)} title="Eliminar"
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items preview */}
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <div className="flex flex-wrap gap-2">
                    {(inv.items as any[])?.slice(0, 3).map((item: any, idx: number) => (
                      <span key={idx} className="text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        {item.description || item.name} ×{item.quantity}
                      </span>
                    ))}
                    {(inv.items as any[])?.length > 3 && (
                      <span className="text-[11px] text-gray-400">+{(inv.items as any[]).length - 3} más</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                    <span>Día {inv.dayOfMonth} de cada {inv.frequency === 'monthly' ? 'mes' : 'período'}</span>
                    <span>·</span>
                    <span>{inv.totalEmitted} emitida{inv.totalEmitted !== 1 ? 's' : ''}</span>
                    {inv.observations && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[200px]">{inv.observations}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nueva Factura Recurrente</h2>
                <p className="text-xs text-gray-500">Se emitirá automáticamente según la frecuencia</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Cliente */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" /> Cliente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Nombre / Razón Social *</label>
                    <input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">CUIT</label>
                    <input value={form.customerDocument} onChange={e => setForm(p => ({ ...p, customerDocument: e.target.value }))}
                      placeholder="20-12345678-9" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Cond. IVA</label>
                    <select value={form.customerTaxCondition} onChange={e => setForm(p => ({ ...p, customerTaxCondition: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="consumidor_final">Consumidor Final</option>
                      <option value="responsable_inscripto">Resp. Inscripto</option>
                      <option value="monotributista">Monotributista</option>
                      <option value="exento">Exento</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tipo Factura</label>
                    <select value={form.invoiceType} onChange={e => setForm(p => ({ ...p, invoiceType: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="A">Factura A</option>
                      <option value="B">Factura B</option>
                      <option value="C">Factura C</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Programación */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" /> Programación
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Frecuencia</label>
                    <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="monthly">Mensual</option>
                      <option value="bimonthly">Bimestral</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="semiannual">Semestral</option>
                      <option value="annual">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Día del Mes</label>
                    <input type="number" min={1} max={28} value={form.dayOfMonth}
                      onChange={e => setForm(p => ({ ...p, dayOfMonth: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Inicio</label>
                    <input type="date" value={form.startDate}
                      onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Fin (opcional)</label>
                    <input type="date" value={form.endDate}
                      onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> Items
                </h3>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg p-3">
                      <input placeholder="Descripción *" value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        className="flex-1 min-w-[180px] px-3 py-2 border rounded-lg text-sm" />
                      <input type="number" placeholder="Cant" value={item.quantity} min={1}
                        onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20 px-3 py-2 border rounded-lg text-sm text-center" />
                      <input type="number" placeholder="Precio" value={item.unitPrice} min={0} step={0.01}
                        onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-28 px-3 py-2 border rounded-lg text-sm text-right" />
                      <select value={item.ivaRate} onChange={e => updateItem(idx, 'ivaRate', parseFloat(e.target.value))}
                        className="w-24 px-3 py-2 border rounded-lg text-sm">
                        <option value={21}>21%</option>
                        <option value={10.5}>10.5%</option>
                        <option value={27}>27%</option>
                        <option value={0}>0%</option>
                      </select>
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addItem}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Agregar item
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Subtotal:</span>
                  <span className="font-medium">{fmt(calcTotals().subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>IVA:</span>
                  <span className="font-medium">{fmt(calcTotals().tax)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total por emisión:</span>
                  <span>{fmt(calcTotals().total)}</span>
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Observaciones (opcional)</label>
                <textarea value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ej: Servicio de mantenimiento mensual" />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleCreate} disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crear Recurrente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
