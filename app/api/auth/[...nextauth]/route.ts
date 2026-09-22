import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { bindAuthUrlToRequest } from '@/lib/auth-env';

const nextAuthHandler = NextAuth(authOptions);

function handler(req: NextRequest, context: { params: { nextauth: string[] } }) {
  bindAuthUrlToRequest(req);
  return nextAuthHandler(req as never, context);
}

export { handler as GET, handler as POST };
