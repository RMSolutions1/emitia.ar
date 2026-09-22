import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { bindAuthUrlToRequest } from '@/lib/auth-env';

const nextAuth = NextAuth(authOptions);

async function handler(req: NextRequest, context: { params: { nextauth: string[] } }) {
  bindAuthUrlToRequest(req);
  return nextAuth(req, context);
}

export { handler as GET, handler as POST };
