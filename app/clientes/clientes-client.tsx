'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, User, Phone, Mail, FileText, MapPin, X, Users, Building2, Loader2, IdCard, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  documentType?: string;
  address?: string;
  city?: string;
  province?: string;
  taxCondition?: string;
  notes?: string;
}

const taxConditionLabels: Record<string, string> = {
  responsable_inscripto: 'Resp. Inscripto',
  monotributista: 'Monotributista',
  consumidor_final: 'Consumidor Final',
  exento: 'Exento',
};

const taxConditionColors: Record<string, string> = {
  responsable_inscripto: 'bg-blue-100 text-blue-700',
  monotributista: 'bg-green-100 text-green-700',
  consumidor_final: 'bg-gray-100 text-gray-600',
  exento: 'bg-yellow-100 text-yellow-700',
};

export function ClientesClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [cuitSearching, setCuitSearching] = useState(false);
  const [cuitSearchResult, setCuitSearchResult] = useState<{ found: boolean; source?: string; message?: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    documentType: 'CUIT',
    address: '',
    city: '',
    province: '',
    taxCondition: 'consumidor_final',
    notes: '',
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data ?? []);
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(), 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // CUIT/CUIL Lookup from AFIP
  const searchCuit = useCallback(async (doc: string) => {
    const clean = doc.replace(/[-\s.]/g, '');
    if (clean.length < 7) return;

    setCuitSearching(true);
    setCuitSearchResult(null);
    try {
      const res = await fetch(`/api/customers/lookup-document?document=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (data.found && data.customer) {
        setFormData(prev => ({
          ...prev,
          name: data.customer.name || prev.name,
          document: data.customer.document || clean,
          documentType: data.customer.documentType || prev.documentType,
          address: data.customer.address || prev.address,
          city: data.customer.city || prev.city,
          province: data.customer.province || prev.province,
          taxCondition: data.customer.taxCondition || prev.taxCondition,
        }));
        setCuitSearchResult({
          found: true,
          source: data.source,
          message: data.source === 'local'
            ? 'Cliente encontrado en tu base de datos'
            : 'Datos obtenidos del padrón de ARCA/AFIP',
        });
        toast.success(
          data.source === 'local'
            ? `Cliente encontrado: ${data.customer.name}`
            : `Datos AFIP: ${data.customer.name}`
        );
      } else if (data.suggestion) {
        setFormData(prev => ({
          ...prev,
          document: data.suggestion.document,
          documentType: data.suggestion.documentType,
          taxCondition: data.suggestion.taxCondition,
        }));
        setCuitSearchResult({ found: false, message: data.message || 'No encontrado. Completá los datos manualmente.' });
      } else if (data.error) {
        setCuitSearchResult({ found: false, message: data.error });
      }
    } catch (error) {
      console.error('Error searching CUIT:', error);
      toast.error('Error al consultar CUIT');
      setCuitSearchResult({ found: false, message: 'Error de conexión al buscar CUIT' });
    } finally {
      setCuitSearching(false);
    }
  }, []);

  const handleDocumentChange = (value: string) => {
    setFormData(prev => ({ ...prev, document: value }));
    setCuitSearchResult(null);

    const clean = value.replace(/[-\s.]/g, '');
    if (clean.length === 11) {
      const prefix = clean.substring(0, 2);
      if (['20', '23', '24', '27'].includes(prefix)) {
        setFormData(prev => ({ ...prev, document: value, documentType: 'CUIL' }));
      } else {
        setFormData(prev => ({ ...prev, document: value, documentType: 'CUIT' }));
      }
      searchCuit(clean);
    } else if (clean.length >= 7 && clean.length <= 8) {
      setFormData(prev => ({ ...prev, document: value, documentType: 'DNI' }));
    }
  };

  const handleDocumentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchCuit(formData.document);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success(editingCustomer ? 'Cliente actualizado' : 'Cliente creado');
        resetForm();
        fetchCustomers();
      } else {
        const error = await res.json();
        toast.error(error?.error ?? 'Error al guardar cliente');
      }
    } catch (error) {
      toast.error('Error al guardar cliente');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      document: customer.document ?? '',
      documentType: customer.documentType ?? 'CUIT',
      address: customer.address ?? '',
      city: customer.city ?? '',
      province: customer.province ?? '',
      taxCondition: customer.taxCondition ?? 'consumidor_final',
      notes: customer.notes ?? '',
    });
    setCuitSearchResult(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Cliente eliminado');
        fetchCustomers();
      } else {
        toast.error('Error al eliminar. El cliente puede tener ventas asociadas.');
      }
    } catch (error) {
      toast.error('Error al eliminar cliente');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
    setCuitSearchResult(null);
    setFormData({ name: '', email: '', phone: '', document: '', documentType: 'CUIT', address: '', city: '', province: '', taxCondition: 'consumidor_final', notes: '' });
  };

  // Stats
  const totalClientes = customers.length;
  const riCount = customers.filter(c => c.taxCondition === 'responsable_inscripto').length;
  const monoCount = customers.filter(c => c.taxCondition === 'monotributista').length;
  const cfCount = customers.filter(c => c.taxCondition === 'consumidor_final' || !c.taxCondition).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total Clientes</p>
              <p className="text-xl font-bold text-gray-900">{totalClientes}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-100">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Resp. Inscriptos</p>
              <p className="text-xl font-bold text-indigo-600">{riCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-100">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Monotributistas</p>
              <p className="text-xl font-bold text-green-600">{monoCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gray-100">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Cons. Final</p>
              <p className="text-xl font-bold text-gray-600">{cfCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, CUIT/DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingCustomer(null); setCuitSearchResult(null); }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h3>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* CUIT/CUIL Smart Search */}
          <div className="mb-5 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
              <IdCard className="w-4 h-4" />
              Buscar por CUIT / CUIL / DNI
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ingresá el CUIT/CUIL (11 dígitos) o DNI y se completan los datos automáticamente..."
                  value={formData.document}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  onKeyDown={handleDocumentKeyDown}
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-mono pr-10"
                />
                {cuitSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                )}
              </div>
              <button
                type="button"
                onClick={() => searchCuit(formData.document)}
                disabled={cuitSearching || !formData.document}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm"
              >
                <Search className="w-5 h-5" />
                Buscar
              </button>
            </div>

            {/* Search result feedback */}
            {cuitSearchResult && (
              <div className={`mt-3 flex items-start gap-2 text-sm p-2.5 rounded-lg ${
                cuitSearchResult.found
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {cuitSearchResult.found ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                )}
                <span>{cuitSearchResult.message}</span>
              </div>
            )}

            {!cuitSearchResult && !cuitSearching && (
              <p className="mt-2 text-xs text-blue-600">
                Tipo detectado: <span className="font-bold">{formData.documentType}</span>
                {' · '}
                Se busca automáticamente en tu base de datos y en el padrón de ARCA/AFIP
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condición IVA</label>
              <select value={formData.taxCondition} onChange={(e) => setFormData({ ...formData, taxCondition: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="consumidor_final">Consumidor Final</option>
                <option value="responsable_inscripto">Responsable Inscripto</option>
                <option value="monotributista">Monotributista</option>
                <option value="exento">Exento</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
              <select value={formData.documentType} onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="CUIT">CUIT</option>
                <option value="CUIL">CUIL</option>
                <option value="DNI">DNI</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº Documento</label>
              <input type="text" value={formData.document} onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                placeholder="20-12345678-9" readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <input type="text" value={formData.province} onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="lg:col-span-3 flex gap-3 justify-end pt-2">
              <button type="button" onClick={resetForm}
                className="px-5 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors">Cancelar</button>
              <button type="submit"
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
                {editingCustomer ? 'Actualizar' : 'Crear Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay clientes registrados</p>
            <p className="text-gray-400 text-sm mt-1">Agregá tu primer cliente para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Documento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cond. IVA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ubicación</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-blue-50">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{customer.name}</p>
                          {customer.notes && <p className="text-xs text-gray-400 truncate max-w-[200px]">{customer.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {customer.document ? (
                        <div>
                          <p className="text-sm text-gray-900 font-mono">{customer.document}</p>
                          <p className="text-xs text-gray-400">{customer.documentType || 'CUIT'}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${taxConditionColors[customer.taxCondition ?? ''] || 'bg-gray-100 text-gray-600'}`}>
                        {taxConditionLabels[customer.taxCondition ?? ''] || 'Cons. Final'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {customer.email && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />{customer.email}
                          </p>
                        )}
                        {customer.phone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{customer.phone}
                          </p>
                        )}
                        {!customer.email && !customer.phone && <span className="text-xs text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(customer.city || customer.province || customer.address) ? (
                        <p className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[180px]">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {[customer.city, customer.province].filter(Boolean).join(', ') || customer.address}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(customer)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(customer.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && customers.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Mostrando {customers.length} cliente(s)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
