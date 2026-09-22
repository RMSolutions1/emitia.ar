import { withAuth } from 'next-auth/middleware';

const publicPages = new Set(['/', '/login', '/registro', '/recuperar-clave', '/cerrar-sesion', '/privacidad', '/terminos']);

export default withAuth({
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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
