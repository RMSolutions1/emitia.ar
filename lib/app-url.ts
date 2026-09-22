/** URL pública de la app. Nunca lanza Invalid URL si la env está vacía. */
export function getAppUrl(): string {
  const candidates = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    'https://emitia.com.ar',
  ];

  for (const raw of candidates) {
    const value = (raw || '').trim();
    if (!value) continue;
    try {
      const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      return new URL(withProtocol).origin;
    } catch {
      // siguiente candidato
    }
  }

  return 'http://localhost:3000';
}
