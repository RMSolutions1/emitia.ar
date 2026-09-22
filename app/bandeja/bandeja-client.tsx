'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Inbox, AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/alegra/metric-card';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  href?: string;
  timestamp: string;
}

export function BandejaClient() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [counts, setCounts] = useState({ total: 0, critical: 0, warning: 0, info: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications/alerts')
      .then((r) => r.json())
      .then((d) => {
        setAlerts(d.alerts || []);
        setCounts(d.counts || { total: 0, critical: 0, warning: 0, info: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  const icon = (type: string) => {
    if (type === 'critical') return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (type === 'warning') return <AlertCircle className="w-5 h-5 text-amber-500" />;
    return <Info className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Bandeja de entrada"
        description="Alertas, pendientes y acciones recomendadas para tu negocio."
      />
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', val: counts.total, color: 'bg-gray-100' },
          { label: 'Críticas', val: counts.critical, color: 'bg-red-50 text-red-700' },
          { label: 'Advertencias', val: counts.warning, color: 'bg-amber-50 text-amber-700' },
          { label: 'Info', val: counts.info, color: 'bg-blue-50 text-blue-700' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-4 text-center ${c.color}`}>
            <p className="text-2xl font-bold">{c.val}</p>
            <p className="text-xs">{c.label}</p>
          </div>
        ))}
      </div>
      {loading ? (
        <p className="text-gray-500 text-center py-12">Cargando...</p>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay alertas pendientes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Link
              key={a.id}
              href={a.href || '#'}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-teal-300 transition-colors"
            >
              {icon(a.type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{a.title}</p>
                <p className="text-sm text-gray-500 truncate">{a.message}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
