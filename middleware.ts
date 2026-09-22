import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';

const publicPages = new Set([
  '/',
  '/login',
  '/registro',
  '/recuperar-clave',
  '/cerrar-sesion',
  '/privacidad',
  '/terminos',
]);

const authMiddleware = withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;
      if (pathname.startsWith('/api/')) return true;
      if (publicPages.has(pathname)) return true;
      if (pathname.startsWith('/guias')) return true;
      return !!token;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const host = req.headers.get('host') || '';
  if (host === 'emitia.ar') {
    const url = req.nextUrl.clone();
    url.hostname = 'www.emitia.ar';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/auth') ||
    publicPages.has(pathname) ||
    pathname.startsWith('/guias')
  ) {
    return NextResponse.next();
  }
  return authMiddleware(req as never, event);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
