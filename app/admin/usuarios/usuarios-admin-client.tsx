'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Shield,
  UserCog,
  User,
  Key,
  UserCheck,
  UserX,
  Activity,
  Building2,
  Copy,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  companyId: string | null;
  company: {
    id: string;
    name: string;
    plan?: string;
  } | null;
}

interface Company {
  id: string;
  name: string;
}

interface Stats {
  total: number;
  active: number;
  blocked: number;
  inactive: number;
}

export default function UsuariosAdminClient() {
  const { data: session } = useSession() || {};
  const [users, setUsers] = useState<UserData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, blocked: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState<{ user: string; password: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: string; userName: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    companyId: '',
    status: 'active',
  });

  const isSuperadmin = session?.user?.role === 'superadmin';

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (roleFilter) params.append('role', roleFilter);
      if (companyFilter) params.append('companyId', companyFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        if (data.stats) setStats(data.stats);
      } else {
        toast.error(data.error || 'Error al cargar usuarios');
      }
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, companyFilter]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/companies');
      const data = await res.json();
      if (res.ok) {
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (isSuperadmin) {
      fetchCompanies();
    }
  }, [isSuperadmin, fetchCompanies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingUser;
      const url = isEdit ? `/api/admin/users/${editingUser!.id}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: any = { ...formData };
      if (isEdit && !formData.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || (isEdit ? 'Usuario actualizado' : 'Usuario creado'));
        setShowModal(false);
        setEditingUser(null);
        resetForm();
        fetchUsers();
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar usuario');
    }
  };

  const handleQuickAction = async (userId: string, action: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });

      const data = await res.json();
      if (res.ok) {
        if (action === 'reset_password' && data.tempPassword) {
          const user = users.find(u => u.id === userId);
          setTempPasswordModal({
            user: user?.name || user?.email || 'Usuario',
            password: data.tempPassword,
          });
        } else {
          const actionLabels: Record<string, string> = {
            block: 'Usuario bloqueado',
            unblock: 'Usuario desbloqueado',
            activate: 'Usuario activado',
            deactivate: 'Usuario desactivado',
          };
          toast.success(actionLabels[action] || data.message || 'Acción completada');
        }
        fetchUsers();
      } else {
        toast.error(data.error || 'Error');
      }
    } catch (error) {
      toast.error('Error al ejecutar acción');
    }
    setConfirmAction(null);
  };

  const handleDelete = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Usuario eliminado');
        fetchUsers();
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
    setConfirmAction(null);
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role,
      companyId: user.company?.id || '',
      status: user.status,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      companyId: isSuperadmin ? '' : session?.user?.companyId || '',
      status: 'active',
    });
    setShowPassword(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin': return <Shield className="w-4 h-4 text-purple-600" />;
      case 'company_admin': return <UserCog className="w-4 h-4 text-blue-600" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      superadmin: 'Super Admin',
      company_admin: 'Admin Empresa',
      user: 'Usuario',
    };
    return labels[role] || role;
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'company_admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
      active: { icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'bg-green-100 text-green-800', label: 'Activo' },
      inactive: { icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-yellow-100 text-yellow-800', label: 'Inactivo' },
      blocked: { icon: <XCircle className="w-3.5 h-3.5" />, cls: 'bg-red-100 text-red-800', label: 'Bloqueado' },
    };
    const c = config[status] || config.active;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${c.cls}`}>
        {c.icon} {c.label}
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const statCards = [
    { label: 'Total', value: stats.total, icon: <Users className="w-5 h-5" />, color: 'bg-blue-50 text-blue-700 border-blue-200', iconBg: 'bg-blue-100' },
    { label: 'Activos', value: stats.active, icon: <UserCheck className="w-5 h-5" />, color: 'bg-green-50 text-green-700 border-green-200', iconBg: 'bg-green-100' },
    { label: 'Inactivos', value: stats.inactive, icon: <UserX className="w-5 h-5" />, color: 'bg-yellow-50 text-yellow-700 border-yellow-200', iconBg: 'bg-yellow-100' },
    { label: 'Bloqueados', value: stats.blocked, icon: <Ban className="w-5 h-5" />, color: 'bg-red-50 text-red-700 border-red-200', iconBg: 'bg-red-100' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            Gestión de Usuarios
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isSuperadmin ? 'Administrar todos los usuarios del sistema' : 'Administrar usuarios de tu empresa'}
          </p>
        </div>
        <button
          onClick={() => { setEditingUser(null); resetForm(); setShowModal(true); }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" /> Nuevo Usuario
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
              <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                {card.icon}
              </div>
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
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
          {isSuperadmin && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Todas las empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            <option value="">Todos los roles</option>
            {isSuperadmin && <option value="superadmin">Super Admin</option>}
            <option value="company_admin">Admin Empresa</option>
            <option value="user">Usuario</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="blocked">Bloqueados</option>
          </select>
          <button
            onClick={fetchUsers}
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
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                {isSuperadmin && (
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                )}
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Último Acceso</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registro</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={isSuperadmin ? 7 : 6} className="px-6 py-16 text-center">
                    <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Cargando usuarios...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? 7 : 6} className="px-6 py-16 text-center">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No se encontraron usuarios</p>
                    <p className="text-gray-400 text-sm mt-1">Ajustá los filtros o creá uno nuevo</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === session?.user?.id;
                  return (
                    <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors ${isSelf ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                            {(user.name || user.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {user.name || 'Sin nombre'}
                              {isSelf && <span className="ml-2 text-xs text-blue-500 font-normal">(Vos)</span>}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 border ${getRoleBadgeClass(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      {isSuperadmin && (
                        <td className="px-6 py-4">
                          {user.company ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm text-gray-700">{user.company.name}</span>
                              {user.company.plan && (
                                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                                  {user.company.plan}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Global</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.lastLoginAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ userId: user.id, action: 'reset_password', userName: user.name || user.email || '' })}
                            className="p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"
                            title="Resetear contraseña"
                            disabled={isSelf}
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          {user.status === 'active' ? (
                            <button
                              onClick={() => setConfirmAction({ userId: user.id, action: 'block', userName: user.name || user.email || '' })}
                              className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                              title="Bloquear"
                              disabled={isSelf}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : user.status === 'blocked' ? (
                            <button
                              onClick={() => handleQuickAction(user.id, 'activate')}
                              className="p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors"
                              title="Desbloquear"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickAction(user.id, 'activate')}
                              className="p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors"
                              title="Activar"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmAction({ userId: user.id, action: 'delete', userName: user.name || user.email || '' })}
                            className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            title="Eliminar"
                            disabled={isSelf}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {users.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            Mostrando {users.length} usuario{users.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {editingUser ? <Edit className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Nombre y apellido"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="correo@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {editingUser ? '(dejar vacío para mantener)' : '*'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-10"
                    placeholder={editingUser ? '••••••••' : 'Mínimo 8 caracteres'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {isSuperadmin && <option value="superadmin">Super Admin</option>}
                    <option value="company_admin">Admin Empresa</option>
                    <option value="user">Usuario</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </div>
              </div>
              {isSuperadmin && formData.role !== 'superadmin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
                  <select
                    required
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="">Seleccionar empresa...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
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
                confirmAction.action === 'delete' ? 'bg-red-100' :
                confirmAction.action === 'block' ? 'bg-orange-100' : 'bg-amber-100'
              }`}>
                {confirmAction.action === 'delete' ? <Trash2 className="w-7 h-7 text-red-600" /> :
                 confirmAction.action === 'block' ? <Ban className="w-7 h-7 text-orange-600" /> :
                 <Key className="w-7 h-7 text-amber-600" />}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {confirmAction.action === 'delete' ? '¿Eliminar usuario?' :
                 confirmAction.action === 'block' ? '¿Bloquear usuario?' :
                 '¿Resetear contraseña?'}
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                <span className="font-medium text-gray-700">{confirmAction.userName}</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {confirmAction.action === 'delete' ? 'Esta acción no se puede deshacer.' :
                 confirmAction.action === 'block' ? 'El usuario no podrá acceder al sistema.' :
                 'Se generará una contraseña temporal.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (confirmAction.action === 'delete') {
                      handleDelete(confirmAction.userId);
                    } else {
                      handleQuickAction(confirmAction.userId, confirmAction.action);
                    }
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm ${
                    confirmAction.action === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                    confirmAction.action === 'block' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {confirmAction.action === 'delete' ? 'Sí, eliminar' :
                   confirmAction.action === 'block' ? 'Sí, bloquear' :
                   'Sí, resetear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temp Password Modal */}
      {tempPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setTempPasswordModal(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                <Key className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Contraseña Temporal</h3>
              <p className="text-sm text-gray-500 mb-4">Para: <span className="font-medium text-gray-700">{tempPasswordModal.user}</span></p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="font-mono text-lg font-bold text-gray-900 tracking-wider select-all">{tempPasswordModal.password}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPasswordModal.password);
                  toast.success('Contraseña copiada');
                }}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium mb-2 flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copiar contraseña
              </button>
              <button
                onClick={() => setTempPasswordModal(null)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600"
              >
                Cerrar
              </button>
              <p className="text-xs text-amber-600 mt-3 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Compartí esta contraseña de forma segura
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
