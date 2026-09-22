'use client';

import { useState } from 'react';
import { Mail, CheckCircle, Send, Shield } from 'lucide-react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';

export default function RecuperarClavePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al procesar la solicitud');
      } else {
        setSent(true);
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={sent ? '¡Listo!' : '¿Olvidaste tu contraseña?'}
      subtitle={
        sent
          ? 'Revisá tu bandeja de entrada para continuar'
          : 'Ingresá tu email y te enviaremos una contraseña temporal'
      }
      panelTitle="Recuperá el acceso a tu cuenta"
      panelSubtitle="Te enviamos instrucciones por email de forma segura. Si no encontrás el mensaje, revisá la carpeta de spam."
      features={[
        { icon: Shield, text: 'Proceso seguro y encriptado' },
        { icon: Mail, text: 'Instrucciones por email al instante' },
        { icon: CheckCircle, text: 'Volvé a facturar en minutos' },
      ]}
      backHref="/login"
      backLabel="Volver al login"
    >
      {!sent ? (
        <>
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email de tu cuenta
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Recuperar contraseña
                </>
              )}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-600 mb-2">
            Si el email <strong className="text-gray-800">{email}</strong> está registrado, recibirás una contraseña temporal.
          </p>
          <p className="text-gray-400 text-sm mb-6">Revisá tu bandeja de entrada y la carpeta de spam.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full bg-blue-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Ir al login
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
