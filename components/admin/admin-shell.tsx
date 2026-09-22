'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Activity,
  ShieldCheck,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  Crown,
} from 'lucide-react';

interface AdminNavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  desc: string;
}

const ADMIN_NAV: AdminNavItem[] = [
  { name: 'Resumen', href: '/admin/dashboard', icon: LayoutDashboard, desc: 'Métricas de la plataforma' },
  { name: 'Empresas', href: '/admin/empresas', icon: Building2, desc: 'Clientes y suscripciones' },
  { name: 'Usuarios', href: '/admin/usuarios', icon: Users, desc: 'Accesos globales' },
  { name: 'Estado del sistema', href: '/admin/sistema', icon: Activity, desc: 'Salud e integraciones' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = session?.user as { name?: string | null; email?: string | null } | undefined;
  const initial = user?.name?.charAt(0)?.toUpperCase() || 'A';

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const nav = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-white">EMITIA</p>
          <p className="text-[11px] leading-tight text-violet-300">Panel de plataforma</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                active
                  ? 'bg-violet-600/90 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-tight">{item.name}</span>
                <span className={`block text-[11px] leading-tight ${active ? 'text-violet-100' : 'text-slate-500'}`}>
                  {item.desc}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-800 px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al ERP
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-900/40 hover:text-red-200"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-700 bg-slate-900 p-2 text-white shadow-lg lg:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex w-72 flex-col bg-slate-900 transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {nav}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 lg:flex">{nav}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 pl-16 lg:pl-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Crown className="h-4 w-4 text-violet-600" />
            Administración de plataforma
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-slate-800">{user?.name || 'Administrador'}</p>
              <p className="text-[11px] leading-tight text-slate-400">{user?.email}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
              {initial}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
