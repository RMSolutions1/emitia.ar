'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, LogOut, Monitor, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PdvShellProps {
  children: React.ReactNode;
  companyName?: string | null;
  defaultTerminal?: number;
}

export function PdvShell({ children, companyName = 'Mi Empresa', defaultTerminal = 1 }: PdvShellProps) {
  const [terminal, setTerminal] = useState(String(defaultTerminal));

  useEffect(() => {
    const saved = localStorage.getItem('emitia-pdv-terminal');
    if (saved) {
      setTerminal(saved);
    } else if (defaultTerminal) {
      localStorage.setItem('emitia-pdv-terminal', String(defaultTerminal));
    }
  }, [defaultTerminal]);

  const focusErpTab = () => {
    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      window.opener.focus();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0f172a]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700 bg-[#1e293b] px-4 py-2.5 text-white shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 font-bold text-sm">
            PDV
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">EMITIA Punto de Venta</p>
            <p className="truncate text-xs text-slate-400">{companyName || 'Mi Empresa'}</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs sm:flex">
          <Monitor className="h-3.5 w-3.5 text-emerald-400" />
          <span>Terminal PV {terminal.padStart(4, '0')}</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={focusErpTab}
            className="flex items-center gap-1.5 rounded-lg bg-slate-700/80 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-600 sm:px-3 sm:text-sm"
            title="Volver a la pestaña del sistema de gestión"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Volver al ERP</span>
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white sm:px-3 sm:text-sm"
            title="Abrir sistema de gestión en esta pestaña"
          >
            <span className="hidden md:inline">Abrir ERP aquí</span>
            <span className="md:hidden">ERP</span>
          </Link>
          <Link
            href="/configuracion/puntos-venta"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            title="Configurar terminales"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-900/40 hover:text-red-300"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-[#f1f5f9] p-3 sm:p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
