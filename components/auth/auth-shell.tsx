import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type AuthFeature = { icon: LucideIcon; text: string };

type AuthShellProps = {
  title: string;
  subtitle: string;
  panelTitle: string;
  panelSubtitle: string;
  features: AuthFeature[];
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
  wide?: boolean;
};

export function AuthShell({
  title,
  subtitle,
  panelTitle,
  panelSubtitle,
  features,
  backHref,
  backLabel = 'Volver al inicio',
  children,
  wide = false,
}: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="bg-blue-950 text-blue-100 text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="hover:text-white transition font-medium">
            EMITIA — Facturación y gestión para PyMEs
          </Link>
          <Link href="/" className="hidden sm:inline-flex items-center gap-1 hover:text-white transition">
            <ArrowLeft className="w-3 h-3" /> Inicio
          </Link>
        </div>
      </div>

      <div className="flex flex-1">
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-[480px] h-[480px] bg-cyan-500/10 rounded-full translate-x-1/4 translate-y-1/4" />
          </div>
          <div className="relative z-10 flex flex-col justify-between p-10 xl:p-12 w-full">
            <BrandLogo variant="white" size="lg" href="/" />
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">{panelTitle}</h2>
                <p className="text-blue-100/90 mt-4 text-lg leading-relaxed max-w-md">{panelSubtitle}</p>
              </div>
              <ul className="space-y-3 max-w-sm">
                {features.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-white/90 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-4 h-4 text-cyan-300" />
                    </div>
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-blue-300/80 text-xs">© 2026 EMITIA · Facturación electrónica Argentina</p>
          </div>
        </div>

        <div className={`w-full ${wide ? 'lg:w-7/12 xl:w-1/2' : 'lg:w-7/12 xl:w-1/2'} flex items-center justify-center p-6 sm:p-10`}>
          <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'}`}>
            <div className="lg:hidden mb-6">
              <BrandLogo size="md" href="/" className="mx-auto" />
            </div>
            {backHref && (
              <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-6 transition">
                <ArrowLeft className="w-4 h-4" /> {backLabel}
              </Link>
            )}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-500 mt-2">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
