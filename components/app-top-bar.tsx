'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import {
  Building2,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  User as UserIcon,
  Crown,
  Shield,
  LifeBuoy,
} from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { CommandPalette } from './command-palette';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  company_admin: 'Administrador',
  contador: 'Contador',
  user: 'Usuario',
};

export function AppTopBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = session?.user as
    | { name?: string | null; email?: string | null; role?: string; companyName?: string; companyPlan?: string }
    | undefined;
  const companyName = user?.companyName;
  const companyPlan = user?.companyPlan || 'free';
  const role = user?.role || 'user';

  const planLabel =
    companyPlan === 'empresa' ? 'Empresa' :
    companyPlan === 'gestion' ? 'Gestión' : 'Free';

  const roleLabel = ROLE_LABELS[role] || 'Usuario';
  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';

  const avatarColor =
    role === 'superadmin' ? 'bg-violet-600' :
    role === 'company_admin' ? 'bg-blue-600' :
    role === 'contador' ? 'bg-teal-600' : 'bg-gray-600';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-gray-200/80 bg-white/90 px-4 pl-14 backdrop-blur-md lg:pl-6">
      {/* Buscador global (estilo Alegra: en el header, no en el sidebar) */}
      <button
        onClick={() => setShowCommandPalette(true)}
        className="group flex h-9 flex-1 max-w-md items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-left transition-colors hover:bg-gray-100"
      >
        <Search className="h-4 w-4 text-gray-400 group-hover:text-gray-500" />
        <span className="flex-1 truncate text-sm text-gray-400">Buscar facturas, clientes, productos…</span>
        <kbd className="hidden rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        {/* Badge de empresa y plan */}
        {companyName && (
          <div className="hidden items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 md:flex">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="max-w-[160px] truncate text-xs font-medium text-gray-600 lg:max-w-[220px]">
              {companyName}
            </span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                companyPlan === 'empresa' ? 'bg-violet-100 text-violet-700' :
                companyPlan === 'gestion' ? 'bg-emerald-100 text-emerald-700' :
                'bg-gray-100 text-gray-500'
              }`}
            >
              {planLabel}
            </span>
          </div>
        )}

        <NotificationBell />

        {/* Menú de usuario (perfil + cerrar sesión, sin scroll) */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-gray-100"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor}`}>
              {initial}
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-[120px] truncate text-sm font-medium leading-tight text-gray-900">
                {user?.name || 'Usuario'}
              </span>
              <span className="block text-[11px] leading-tight text-gray-400">{roleLabel}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
              <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold text-white ${avatarColor}`}>
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{user?.name || 'Usuario'}</p>
                    <p className="truncate text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
                {role === 'superadmin' ? (
                  <div className="mt-2 flex items-center gap-1.5 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                    <Crown className="h-3.5 w-3.5" /> Super Administrador de plataforma
                  </div>
                ) : companyName ? (
                  <div className="mt-2 flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    <Building2 className="h-3.5 w-3.5" /> {companyName}
                  </div>
                ) : null}
              </div>

              <div className="py-1">
                {role === 'superadmin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Shield className="h-4 w-4 text-gray-400" /> Panel de plataforma
                  </Link>
                )}
                {(role === 'company_admin' || role === 'superadmin') && (
                  <Link
                    href="/configuracion"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4 text-gray-400" /> Configuración
                  </Link>
                )}
                <Link
                  href="/guias"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <LifeBuoy className="h-4 w-4 text-gray-400" /> Ayuda y guías
                </Link>
              </div>

              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut({ callbackUrl: '/login' });
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CommandPalette externalOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
    </header>
  );
}
