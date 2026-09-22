import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

type LegalPageProps = {
  title: string;
  updated: string;
  children: React.ReactNode;
};

export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
          <BrandLogo size="sm" href="/" />
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Última actualización: {updated}</p>
        <div className="mt-8 prose prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-blue-600">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/privacidad" className="hover:text-gray-900">Privacidad</Link>
          <Link href="/terminos" className="hover:text-gray-900">Términos</Link>
          <Link href="/login" className="hover:text-gray-900">Iniciar sesión</Link>
          <span className="text-gray-400">CUIT: 20-40154622-8</span>
        </div>
      </footer>
    </div>
  );
}
