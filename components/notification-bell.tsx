'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, Info, X, Package, Receipt, Wallet, ShoppingCart, ChevronRight } from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  href?: string;
  timestamp: string;
}

interface AlertCounts {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  stock: Package,
  facturacion: Receipt,
  cuentas: Wallet,
  ventas: ShoppingCart,
};

const TYPE_STYLES = {
  critical: {
    bg: 'bg-red-50',
    iconColor: 'text-red-500',
    dot: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    dot: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    dot: 'bg-blue-500',
  },
};

const PANEL_WIDTH = 360;

export function NotificationBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [counts, setCounts] = useState<AlertCounts>({ total: 0, critical: 0, warning: 0, info: 0 });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const padding = 12;

    let left = rect.right - PANEL_WIDTH;
    left = Math.max(padding, Math.min(left, viewportWidth - PANEL_WIDTH - padding));

    setPanelStyle({
      top: rect.bottom + 8,
      left,
    });
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setCounts(data.counts || { total: 0, critical: 0, warning: 0, info: 0 });
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      updatePanelPosition();
      fetchAlerts();
    }
    setOpen((prev) => !prev);
  };

  const handleAlertClick = (alert: Alert) => {
    if (alert.href) {
      router.push(alert.href);
      setOpen(false);
    }
  };

  const actionableCount = counts.critical + counts.warning;

  const panel = open && mounted ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notificaciones"
      className="fixed z-[200] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
      style={{ top: panelStyle.top, left: panelStyle.left, width: PANEL_WIDTH }}
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {actionableCount > 0
              ? `${actionableCount} alerta${actionableCount > 1 ? 's' : ''} activa${actionableCount > 1 ? 's' : ''}`
              : 'Todo en orden'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg hover:bg-gray-200/70 text-gray-400 transition-colors"
          aria-label="Cerrar notificaciones"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[min(420px,60vh)] overflow-y-auto">
        {loading && alerts.length === 0 && (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">Sin alertas</p>
            <p className="text-xs text-gray-400 mt-1">Tu negocio está al día</p>
          </div>
        )}

        {alerts.map((alert) => {
          const style = TYPE_STYLES[alert.type];
          const CategoryIcon = CATEGORY_ICONS[alert.category] || Info;
          return (
            <button
              key={alert.id}
              type="button"
              onClick={() => handleAlertClick(alert)}
              className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
            >
              <div className={`p-2 rounded-lg ${style.bg} flex-shrink-0`}>
                <CategoryIcon className={`w-4 h-4 ${style.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot} flex-shrink-0`} />
                  <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{alert.message}</p>
              </div>
              {alert.href && (
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">Se actualiza cada 5 minutos</p>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative p-2 rounded-lg transition-colors ${
          open ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {actionableCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white rounded-full px-1 ${
              counts.critical > 0 ? 'bg-red-500' : 'bg-amber-500'
            }`}
          >
            {actionableCount > 99 ? '99+' : actionableCount}
          </span>
        )}
      </button>
      {mounted && panel && createPortal(panel, document.body)}
    </>
  );
}
