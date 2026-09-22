import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sanitizeAuthEnv } from '@/lib/auth-env';

sanitizeAuthEnv();

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
