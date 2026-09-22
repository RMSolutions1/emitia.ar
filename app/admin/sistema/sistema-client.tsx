'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  Database,
  Shield,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Check {
  ok: boolean;
  detail?: string;
  error?: string;
  environment?: string;
  cuit?: string;
  provider?: string;
  available?: string[];
}

interface HealthReport {
  success: boolean;
  timestamp: string;
  env: Record<string, boolean>;
  database: Check;
  afip: Check;
  ai: Check;
}

export function SistemaClient() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/health');
      const data = await res.json();
      if (res.ok) {
        setReport(data);
      } else {
        toast.error(data.error || 'Error al consultar el estado');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const services = report
    ? [
        {
          name: 'Base de datos',
          icon: Database,
          check: report.database,
          desc: 'PostgreSQL',
        },
        {
          name: 'ARCA / AFIP',
          icon: Shield,
          check: report.afip,
          desc: report.afip.environment ? `Entorno ${report.afip.environment}` : 'Facturación electrónica',
        },
        {
          name: 'Inteligencia Artificial',
          icon: Sparkles,
          check: report.ai,
          desc: report.ai.provider ? `Proveedor: ${report.ai.provider}` : 'Contador IA / OCR',
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <span className="rounded-xl bg-violet-100 p-2">
              <Activity className="h-6 w-6 text-violet-600" />
            </span>
            Estado del sistema
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Salud de las integraciones críticas de la plataforma EMITIA.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Re-verificar
        </button>
      </div>

      {loading && !report ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : report ? (
        <>
          <div
            className={`flex items-center gap-3 rounded-2xl border p-5 ${
              report.success
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            {report.success ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : (
              <XCircle className="h-8 w-8 text-amber-600" />
            )}
            <div>
              <p className={`font-semibold ${report.success ? 'text-emerald-800' : 'text-amber-800'}`}>
                {report.success ? 'Todos los servicios operativos' : 'Hay servicios que requieren atención'}
              </p>
              <p className="text-xs text-gray-500">
                Última verificación: {new Date(report.timestamp).toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.name} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-gray-100 p-2">
                      <Icon className="h-5 w-5 text-gray-600" />
                    </div>
                    {s.check.ok ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> OK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        <XCircle className="h-3.5 w-3.5" /> Falla
                      </span>
                    )}
                  </div>
                  <p className="mt-3 font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                  <p className={`mt-2 text-xs ${s.check.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {s.check.detail || s.check.error || '—'}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <KeyRound className="h-4 w-4 text-gray-400" /> Variables de entorno
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(report.env).map(([key, present]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <span className="truncate font-mono text-xs text-gray-600">{key}</span>
                  {present ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
