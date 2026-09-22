/** Limpia CRLF/espacios que PowerShell deja al cargar env vars en Vercel. */
export function sanitizeAuthEnv() {
  const url = process.env.NEXTAUTH_URL;
  if (url) {
    process.env.NEXTAUTH_URL = url.replace(/[\r\n\t]/g, '').trim();
  }
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    process.env.NEXTAUTH_SECRET = secret.replace(/[\r\n\t]/g, '').trim();
  }
}

export function bindAuthUrlToRequest(req: { headers: Headers }) {
  sanitizeAuthEnv();
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`.replace(/[\r\n\t]/g, '').trim();
  }
}
