'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { LogOut, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export default function CerrarSesionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <BrandLogo size="md" href="/" className="mx-auto mb-6" />
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Cerrar sesión</h1>
        <p className="mt-2 text-gray-600 text-sm">¿Querés salir de tu cuenta EMITIA?</p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-6 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
        >
          Sí, cerrar sesión
        </button>
        <Link
          href="/dashboard"
          className="mt-3 inline-flex items-center justify-center gap-2 w-full py-3.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al panel
        </Link>
      </div>
    </div>
  );
}
