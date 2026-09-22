'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Users,
  Package,
  FileText,
  ShoppingCart,
  UserCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  legalName: string | null;
  cuit: string | null;
  condicionIva: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  status: string;
  plan: string;
  maxUsers: number;
  maxPOS: number;
  paymentStatus: string;
  daysOverdue: number;
  createdAt: string;
  _count: {
    users: number;
    products: number;
    customers: number;
    sales: number;
    invoices: number;
  };
}

interface Stats {
  total: number;
  active: number;
  suspended: number;
  blocked: number;
  overdue: number;
}

export default function EmpresasClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, suspended: 0, blocked: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [detailCompany, setDetailCompany] = useState<Company | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ companyId: string; action: string; companyName: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    cuit: '',
    condicionIva: 'responsable_inscripto',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    plan: 'free',
    maxUsers: 1,
    maxPOS: 1,
  });

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/admin/companies?${params}`);
      const data = await res.json();
      if (res.ok) {
        setCompanies(data.companies || []);
        if (data.stats) setStats(data.stats);
      } else {
        toast.error(data.error || 'Error al cargar empresas');
      }
    } catch (error) {
      toast.error('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingCompany;
      const url = isEdit ? `/api/admin/companies/${editingCompany!.id}` : '/api/admin/companies';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || (isEdit ? 'Empresa actualizada' : 'Empresa creada'));
        setShowModal(false);
        setEditingCompany(null);
        resetForm();
        fetchCompanies();
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar empresa');
    }
  };

  const handleQuickAction = async (companyId: string, action: string) => {
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, action }),
      });

      const data = await res.json();
      if (res.ok) {
        const labels: Record<string, string> = {
          block: 'Empresa bloqueada',
          unblock: 'Empresa desbloqueada',
          toggle_status: 'Estado de la empresa actualizado',
          record_payment: 'Pago registrado',
        };
        toast.success(labels[action] || data.message || 'Acción completada');
        fetchCompanies();
      } else {
        toast.error(data.error || 'Error');
      }
    } catch (error) {
      toast.error('Error al ejecutar acción');
    }
    setConfirmAction(null);
  };

  const handleDelete = async (companyId: string) => {
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Empresa eliminada');
        fetchCompanies();
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar empresa');
    }
    setConfirmAction(null);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      legalName: company.legalName || '',
      cuit: company.cuit || '',
      condicionIva: company.condicionIva || 'responsable_inscripto',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      city: company.city || '',
      province: company.province || '',
      postalCode: company.postalCode || '',
      plan: company.plan,
      maxUsers: company.maxUsers,
      maxPOS: company.maxPOS,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '', legalName: '', cuit: '', condicionIva: 'responsable_inscripto',
      email: '', phone: '', address: '', city: '', province: '', postalCode: '',
      plan: 'free', maxUsers: 1, maxPOS: 1,
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
      active: { icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'bg-green-100 text-green-800', label: 'Activa' },
      suspended: { icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-yellow-100 text-yellow-800', label: 'Suspendida' },
      blocked: { icon: <XCircle className="w-3.5 h-3.5" />, cls: 'bg-red-100 text-red-800', label: 'Bloqueada' },
    };
    const c = config[status] || config.active;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${c.cls}`}>
        {c.icon} {c.label}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const config: Record<string, { cls: string; label: string }> = {
      free: { cls: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Free' },
      gestion: { cls: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Gestión' },
      empresa: { cls: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Empresa' },
    };
    const c = config[plan] || config.free;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${c.cls}`}>
        {c.label}
      </span>
    );
  };

  const getIvaLabel = (cond: string) => {
    const labels: Record<string, string> = {
      responsable_inscripto: 'Resp. Inscripto',
      monotributista: 'Monotributista',
      exento: 'Exento',
      consumidor_final: 'Cons. Final',
    };
    return labels[cond] || cond;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const statCards = [
    { label: 'Total', value: stats.total, icon: <Building2 className="w-5 h-5" />, color: 'bg-purple-50 text-purple-700 border-purple-200', iconBg: 'bg-purple-100' },
    { label: 'Activas', value: stats.active, icon: <CheckCircle className="w-5 h-5" />, color: 'bg-green-50 text-green-700 border-green-200', iconBg: 'bg-green-100' },
    { label: 'Suspendidas', value: stats.suspended, icon: <Clock className="w-5 h-5" />, color: 'bg-yellow-50 text-yellow-700 border-yellow-200', iconBg: 'bg-yellow-100' },
    { label: 'Bloqueadas', value: stats.blocked, icon: <Ban className="w-5 h-5" />, color: 'bg-red-50 text-red-700 border-red-200', iconBg: 'bg-red-100' },
  ];

  const provinces = [
    'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
    'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
    'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
    'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            Gestión de Empresas
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Administrar todas las empresas del sistema</p>
        </div>
        <button
          onClick={() => { setEditingCompany(null); resetForm(); setShowModal(true); }}
          className="bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" /> Nueva Empresa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`rounded-xl border p-4 ${card.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-75 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${card.iconBg}`}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, CUIT o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="suspended">Suspendidas</option>
            <option value="blocked">Bloqueadas</option>
          </select>
          <button
            onClick={fetchCompanies}
            className="px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">CUIT</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Uso</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Alta</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Cargando empresas...</p>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No se encontraron empresas</p>
                    <p className="text-gray-400 text-sm mt-1">Ajustá los filtros o creá una nueva</p>
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                          {company.name[0].toUpperCase()}
                        </div>
                        <div>
                          <button
                            onClick={() => setDetailCompany(company)}
                            className="font-medium text-gray-900 text-sm hover:text-purple-600 transition-colors text-left"
                          >
                            {company.name}
                          </button>
                          <p className="text-xs text-gray-500">{company.email || 'Sin email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{company.cuit || '—'}</td>
                    <td className="px-6 py-4">{getStatusBadge(company.status)}</td>
                    <td className="px-6 py-4">{getPlanBadge(company.plan)}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p className="flex items-center gap-1"><Users className="w-3 h-3" /> {company._count.users}/{company.maxUsers} usuarios</p>
                        <p className="flex items-center gap-1"><FileText className="w-3 h-3" /> {company._count.invoices} facturas</p>
                        <p className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> {company._count.sales} ventas</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(company.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailCompany(company)}
                          className="p-1.5 text-gray-500 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(company)}
                          className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {company.status === 'blocked' ? (
                          <button
                            onClick={() => handleQuickAction(company.id, 'unblock')}
                            className="p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors"
                            title="Reactivar acceso"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleQuickAction(company.id, 'toggle_status')}
                              className={`p-1.5 rounded-lg transition-colors ${
                                company.status === 'suspended'
                                  ? 'text-gray-500 hover:bg-green-50 hover:text-green-600'
                                  : 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'
                              }`}
                              title={company.status === 'suspended' ? 'Reactivar empresa' : 'Suspender empresa'}
                            >
                              {company.status === 'suspended' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setConfirmAction({ companyId: company.id, action: 'block', companyName: company.name })}
                              className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                              title="Bloquear acceso"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setConfirmAction({ companyId: company.id, action: 'delete', companyName: company.name })}
                          className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {companies.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            Mostrando {companies.length} empresa{companies.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetailCompany(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  {detailCompany.name[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{detailCompany.name}</h2>
                  <p className="text-sm text-gray-500">{detailCompany.legalName || 'Sin razón social'}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="CUIT" value={detailCompany.cuit} />
                <InfoItem label="Condición IVA" value={getIvaLabel(detailCompany.condicionIva)} />
                <InfoItem label="Email" value={detailCompany.email} />
                <InfoItem label="Teléfono" value={detailCompany.phone} />
                <InfoItem label="Dirección" value={detailCompany.address} />
                <InfoItem label="Ciudad" value={detailCompany.city} />
                <InfoItem label="Provincia" value={detailCompany.province} />
                <InfoItem label="Código Postal" value={detailCompany.postalCode} />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Plan y Uso</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-xs text-gray-500">Plan</span>
                    {getPlanBadge(detailCompany.plan)}
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-xs text-gray-500">Estado</span>
                    {getStatusBadge(detailCompany.status)}
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Estadísticas</h3>
                <div className="grid grid-cols-3 gap-3">
                  <StatMini icon={<Users className="w-4 h-4" />} label="Usuarios" value={`${detailCompany._count.users}/${detailCompany.maxUsers}`} />
                  <StatMini icon={<Package className="w-4 h-4" />} label="Productos" value={String(detailCompany._count.products)} />
                  <StatMini icon={<UserCheck className="w-4 h-4" />} label="Clientes" value={String(detailCompany._count.customers)} />
                  <StatMini icon={<ShoppingCart className="w-4 h-4" />} label="Ventas" value={String(detailCompany._count.sales)} />
                  <StatMini icon={<FileText className="w-4 h-4" />} label="Facturas" value={String(detailCompany._count.invoices)} />
                  <StatMini icon={<TrendingUp className="w-4 h-4" />} label="Alta" value={formatDate(detailCompany.createdAt)} />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => { setDetailCompany(null); openEditModal(detailCompany); }}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
              >
                <Edit className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={() => setDetailCompany(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); setEditingCompany(null); resetForm(); }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {editingCompany ? <Edit className="w-5 h-5 text-purple-600" /> : <Plus className="w-5 h-5 text-purple-600" />}
                {editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial *</label>
                  <input type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                  <input type="text" value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                  <input type="text" value={formData.cuit} placeholder="XX-XXXXXXXX-X"
                    onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condición IVA</label>
                  <select value={formData.condicionIva}
                    onChange={(e) => setFormData({ ...formData, condicionIva: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-white">
                    <option value="responsable_inscripto">Responsable Inscripto</option>
                    <option value="monotributista">Monotributista</option>
                    <option value="exento">Exento</option>
                    <option value="consumidor_final">Consumidor Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="text" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input type="text" value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input type="text" value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                  <select value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-white">
                    <option value="">Seleccionar...</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                  <input type="text" value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                  <select value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-white">
                    <option value="free">Free</option>
                    <option value="gestion">Gestión</option>
                    <option value="empresa">Empresa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Usuarios</label>
                  <input type="number" min="1" value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Puntos de Venta</label>
                  <input type="number" min="1" value={formData.maxPOS}
                    onChange={(e) => setFormData({ ...formData, maxPOS: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button"
                  onClick={() => { setShowModal(false); setEditingCompany(null); resetForm(); }}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
                  Cancelar
                </button>
                <button type="submit"
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium shadow-sm">
                  {editingCompany ? 'Guardar Cambios' : 'Crear Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${
                confirmAction.action === 'delete' ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                {confirmAction.action === 'delete'
                  ? <Trash2 className="w-7 h-7 text-red-600" />
                  : <Ban className="w-7 h-7 text-orange-600" />}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {confirmAction.action === 'delete' ? '¿Eliminar empresa?' : '¿Bloquear empresa?'}
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                <span className="font-medium text-gray-700">{confirmAction.companyName}</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {confirmAction.action === 'delete'
                  ? 'Si tiene datos históricos, se bloqueará en lugar de eliminarse.'
                  : 'Los usuarios de esta empresa no podrán acceder al sistema.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (confirmAction.action === 'delete') {
                      handleDelete(confirmAction.companyId);
                    } else {
                      handleQuickAction(confirmAction.companyId, confirmAction.action);
                    }
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm ${
                    confirmAction.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}>
                  {confirmAction.action === 'delete' ? 'Sí, eliminar' : 'Sí, bloquear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  );
}

function StatMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="flex items-center justify-center text-gray-400 mb-1">{icon}</div>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
    </div>
  );
}
