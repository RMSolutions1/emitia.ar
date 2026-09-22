/**
 * Detecta User ID y POS de MercadoPago en producción y los guarda.
 * npx tsx scripts/mp-discover-prod.ts
 */
const BASE = process.env.AUDIT_BASE_URL || 'https://www.emitia.com.ar';
const EMAIL = process.env.AUDIT_LOGIN_EMAIL || 'admin@emitia.com.ar';
const PASSWORD = process.env.AUDIT_LOGIN_PASSWORD || 'Emitia2026!';

async function getCookie(): Promise<string> {
  const jar = new Map<string, string>();
  const parse = (r: Response) => {
    for (const c of r.headers.getSetCookie?.() ?? []) {
      const [p] = c.split(';');
      const [k, ...v] = p.split('=');
      if (k) jar.set(k.trim(), v.join('='));
    }
  };
  const ck = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const csrf = await fetch(`${BASE}/api/auth/csrf`);
  parse(csrf);
  const { csrfToken } = await csrf.json();
  await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: ck() },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, redirect: 'false', json: 'true' }),
  }).then(parse);
  const key = jar.has('__Secure-next-auth.session-token') ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  return `${key}=${jar.get(key)}`;
}

async function main() {
  const cookie = await getCookie();
  const discover = await fetch(`${BASE}/api/payments/mercadopago?discover=1&setup=1`, { headers: { Cookie: cookie } });
  const data = await discover.json();
  console.log('Discover:', JSON.stringify(data, null, 2));

  if (!data.configured) {
    console.log('MP no configurado');
    return;
  }

  const body: Record<string, string> = { provider: 'mercadopago' };
  if (data.mpUserId) body.mpUserId = String(data.mpUserId);
  if (data.posDevices?.[0]?.external_id) body.mpPosId = data.posDevices[0].external_id;

  if (!body.mpUserId && !body.mpPosId) {
    console.log('Sin datos para guardar');
    return;
  }

  const save = await fetch(`${BASE}/api/config/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });
  console.log('Save:', save.status, await save.json());

  const mpTest = await fetch(`${BASE}/api/payments/mercadopago`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      items: [{ name: 'Test MP post-discover', quantity: 1, price: 100 }],
      total: 100,
      mode: 'checkout',
    }),
  });
  console.log('Checkout test:', mpTest.status, await mpTest.json());

  const mpQr = await fetch(`${BASE}/api/payments/mercadopago`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      items: [{ name: 'Test QR', quantity: 1, price: 100 }],
      total: 100,
      mode: 'qr',
    }),
  });
  console.log('QR test:', mpQr.status, await mpQr.json());
}

main().catch(console.error);
