'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Sidebar } from './sidebar';
import { AppTopBar } from './app-top-bar';
import { AdminShell } from './admin/admin-shell';
import { Toaster } from 'react-hot-toast';

const publicPaths = ['/login', '/registro', '/', '/recuperar-clave', '/terminos', '/privacidad', '/cerrar-sesion'];
const standalonePaths = ['/pdv'];

function isPublicPath(pathname: string) {
  return publicPaths.includes(pathname) || pathname.startsWith('/guias');
}

function isStandalonePath(pathname: string) {
  return standalonePaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isPublicPage = isPublicPath(pathname);

  if (isPublicPage) {
    return (
      <>
        <Toaster position="top-right" />
        {children}
      </>
    );
  }

  // PDV independiente (estilo Alegra POS) — sin sidebar ni topbar del ERP
  if (isStandalonePath(pathname)) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
        {children}
      </>
    );
  }

  // Esperar sesión antes de elegir shell (evita que superadmin vea layout ERP en /admin/*)
  if (status === 'loading' && isAdminPath(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );
  }

  // Administración de plataforma (solo superadmin/dueño) — shell propio, separado del ERP.
  // El company_admin gestiona su empresa dentro del ERP, así que conserva el layout normal.
  if (isAdminPath(pathname) && role === 'superadmin') {
    return (
      <AdminShell>
        <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
        {children}
      </AdminShell>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AppTopBar />
        <main className="flex-1 overflow-auto">
          <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
          {children}
        </main>
      </div>
    </div>
  );
}
