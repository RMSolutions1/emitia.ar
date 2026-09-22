import { sanitizeAuthEnv } from '@/lib/auth-env';

export const dynamic = 'force-dynamic';

export async function GET() {
  sanitizeAuthEnv();
  const raw = process.env.NEXTAUTH_URL || '';
  const url = raw.replace(/[\r\n\t]/g, '').trim();
  let host: string | null = null;
  try {
    host = new URL(url).host;
  } catch {
    host = null;
  }
  const secret = (process.env.NEXTAUTH_SECRET || '').replace(/[\r\n\t]/g, '').trim();
  return Response.json({
    ok: Boolean(secret) && Boolean(host),
    hasSecret: Boolean(secret),
    secretLen: secret.length,
    hasUrl: Boolean(url),
    urlHost: host,
    urlHasControlChars: /[\r\n\t]/.test(raw),
    nodeEnv: process.env.NODE_ENV,
  });
}
