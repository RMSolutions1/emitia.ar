import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { getAppUrl } from '@/lib/app-url';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: 'EMITIA - Facturación Electrónica y Gestión Empresarial | Argentina',
  description: 'Facturación electrónica ARCA, POS, inventario y gestión empresarial para PyMEs argentinas. Emití facturas con CAE real. 100% online.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/logo-emitia-icon.svg',
  },
  openGraph: {
    title: 'EMITIA - Facturación Electrónica y Gestión Empresarial',
    description: 'Facturación electrónica ARCA, POS, inventario y reportes para PyMEs argentinas. 100% online.',
    images: ['/logo-emitia.png'],
    siteName: 'EMITIA',
    locale: 'es_AR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EMITIA - Facturación Electrónica Argentina',
    description: 'Facturación electrónica ARCA + ERP completo para PyMEs argentinas. Empezá gratis.',
  },
  keywords: ['facturación electrónica', 'AFIP', 'ARCA', 'CAE', 'ERP', 'Argentina', 'PyME', 'facturas', 'gestión empresarial', 'punto de venta', 'inventario'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'EMITIA',
    statusBarStyle: 'default',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
