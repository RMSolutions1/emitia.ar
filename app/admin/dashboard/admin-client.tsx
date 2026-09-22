'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  DollarSign,
  AlertTriangle,
  FileText,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Stats {
  companies: { total: number; active: number; blocked: number; overdue: number };
  users: number;
  invoices: number;
  sales: number;
  monthlyRevenue: number;
  overdueCompanies: { id: string; name: string; email: string; daysOverdue: number }[];
}

export function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        setStats(await res.json());
      } else {
        toast.error('Error al cargar estadísticas');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  const mainCards = [
    {
      title: 'Empresas Activas',
      value: stats?.companies.active || 0,
      subtitle: `${stats?.companies.total || 0} total`,
      icon: <Building2 className="w-6 h-6" />,
      color: 'from-purple-500 to-indigo-600',
      bgLight: 'bg-purple-50',
      link: '/admin/empresas',
    },
    {
      title: 'Usuarios Totales',
      value: stats?.users || 0,
      subtitle: 'En todo el sistema',
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-600',
      bgLight: 'bg-blue-50',
      link: '/admin/usuarios',
    },
    {
      title: 'Facturas Emitidas',
      value: stats?.invoices || 0,
      subtitle: 'Total global',
      icon: <FileText className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
    },
    {
      title: 'Ventas Registradas',
      value: stats?.sales || 0,
      subtitle: 'Total global',
      icon: <ShoppingCart className="w-6 h-6" />,
      color: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen general del sistema EMITIA</p>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-600"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => card.link && router.push(card.link)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-sm`}>
                {card.icon}
              </div>
            </div>
            {card.link && (
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1 text-xs text-gray-400 group-hover:text-purple-600 transition-colors">
                Ver detalle <ArrowRight className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado de Empresas</h3>
          <div className="space-y-3">
            <StatusRow
              icon={<CheckCircle className="w-4 h-4 text-green-600" />}
              label="Activas"
              value={stats?.companies.active || 0}
              total={stats?.companies.total || 1}
              color="bg-green-500"
            />
            <StatusRow
              icon={<XCircle className="w-4 h-4 text-red-600" />}
              label="Bloqueadas"
              value={stats?.companies.blocked || 0}
              total={stats?.companies.total || 1}
              color="bg-red-500"
            />
            <StatusRow
              icon={<AlertTriangle className="w-4 h-4 text-yellow-600" />}
              label="En atraso"
              value={stats?.companies.overdue || 0}
              total={stats?.companies.total || 1}
              color="bg-yellow-500"
            />
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Ingresos por Suscripciones</h3>
          <div className="text-center py-4">
            <DollarSign className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">
              ${(stats?.monthlyRevenue || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">Ingreso mensual estimado</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Empresas pagando</span>
              <span className="font-semibold text-gray-700">
                {(stats?.companies.total || 0) - (stats?.companies.overdue || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Overdue Companies */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Empresas con Atraso
          </h3>
          {stats?.overdueCompanies && stats.overdueCompanies.length > 0 ? (
            <div className="space-y-3">
              {stats.overdueCompanies.slice(0, 5).map((company) => (
                <div key={company.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{company.name}</p>
                    <p className="text-xs text-gray-400">{company.email}</p>
                  </div>
                  {company.daysOverdue > 0 && (
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      {company.daysOverdue}d
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Sin empresas en atraso</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => router.push('/admin/empresas')}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Gestión de Empresas</p>
                <p className="text-xs text-gray-500">Crear, editar, bloquear empresas</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 transition-colors" />
          </div>
        </button>
        <button
          onClick={() => router.push('/admin/usuarios')}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Gestión de Usuarios</p>
                <p className="text-xs text-gray-500">Crear, editar, bloquear usuarios</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
          </div>
        </button>
      </div>
    </div>
  );
}

function StatusRow({ icon, label, value, total, color }: {
  icon: React.ReactNode; label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {icon}
          {label}
        </div>
        <span className="text-sm font-semibold text-gray-800">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
