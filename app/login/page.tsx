'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock, Eye, EyeOff, FileText, BarChart3, Shield, Zap } from 'lucide-react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [dbWarning, setDbWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('error');
    if (authError === 'Configuration') {
      setError('Error de configuración de autenticación. Recargá la página e intentá de nuevo.');
    } else if (authError && authError !== 'undefined') {
      setError('No se pudo iniciar sesión. Verificá tus datos e intentá de nuevo.');
    }

    fetch('/api/health/db')
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) setDbWarning(data.error || 'Base de datos no disponible');
      })
      .catch(() => setDbWarning('No se pudo verificar la conexión a la base de datos.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const health = await fetch('/api/health/db');
      const healthData = await health.json();
      if (!healthData.ok) {
        setError('No se puede conectar a la base de datos. En Vercel, DATABASE_URL tiene que ser un PostgreSQL público (Neon), no localhost.');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', { redirect: false, email, password });

      if (result?.error) {
        if (result.error === 'DB_CONNECTION_ERROR') {
          setError('No se puede conectar a la base de datos. En Vercel, DATABASE_URL tiene que ser un PostgreSQL público (Neon), no localhost.');
        } else if (result.error === 'Usuario no encontrado') {
          setError('No existe una cuenta con ese email.');
        } else if (result.error === 'Contraseña incorrecta') {
          setError('Contraseña incorrecta.');
        } else if (result.error === 'Configuration' || result.error === 'NEXTAUTH_URL') {
          setError('Error de configuración de autenticación. Recargá la página e intentá de nuevo.');
        } else {
          setError(result.error);
        }
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('Error de conexión. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Bienvenido de vuelta"
      subtitle="Ingresá a tu cuenta para continuar"
      panelTitle="La solución para optimizar tu negocio"
      panelSubtitle="Facturación ARCA, stock, ventas y reportes en un solo sistema en la nube."
      features={[
        { icon: FileText, text: 'Facturación electrónica con CAE real' },
        { icon: BarChart3, text: 'Dashboard y reportes en vivo' },
        { icon: Shield, text: 'Datos encriptados y aislados por empresa' },
        { icon: Zap, text: 'POS rápido desde cualquier dispositivo' },
      ]}
    >
      {dbWarning && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <p className="font-semibold">Base de datos no accesible</p>
          <p className="mt-1 text-amber-700">{dbWarning}</p>
          <p className="mt-2 text-xs">
            En producción usá un PostgreSQL público (Neon). En local: <code className="bg-amber-100 px-1 rounded">npm run db:local</code>
          </p>
        </div>
      )}

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="text-sm font-semibold text-gray-700">Contraseña</label>
            <Link href="/recuperar-clave" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Ingresando...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" /> Iniciar sesión
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-500">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="text-blue-600 hover:text-blue-700 font-semibold">
          Registrate gratis
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-gray-400">
        Al ingresar aceptás nuestros{' '}
        <Link href="/terminos" className="underline hover:text-gray-600">Términos</Link>
        {' '}y{' '}
        <Link href="/privacidad" className="underline hover:text-gray-600">Privacidad</Link>.
      </p>
    </AuthShell>
  );
}
