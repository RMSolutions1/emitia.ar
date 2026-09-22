/** Validación funcional profunda de datos en producción */
const BASE = 'https://www.emitia.com.ar';
const EMAIL = 'admin@emitia.com.ar';
const PASS = 'Emitia2026!';

type R = { test: string; ok: boolean; detail: string };

async function auth(): Promise<string> {
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
  const login = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: ck() },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASS, redirect: 'false', json: 'true' }),
  });
  parse(login);
  const key = jar.has('__Secure-next-auth.session-token') ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  return `${key}=${jar.get(key)}`;
}

async function get(path: string, cookie: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } });
  const t = await r.text();
  try { return { status: r.status, body: JSON.parse(t) }; } catch { return { status: r.status, body: t }; }
}

async function main() {
  const cookie = await auth();
  const results: R[] = [];

  const dash = await get('/api/dashboard', cookie);
  results.push({
    test: 'Dashboard KPIs',
    ok: dash.status === 200 && typeof dash.body === 'object' && dash.body !== null && 'totalSales' in (dash.body as object),
    detail: dash.status === 200 ? `ventas mes: ${(dash.body as { totalSales?: number }).totalSales}` : `HTTP ${dash.status}`,
  });

  const inv = await get('/api/invoices', cookie);
  const invoices = Array.isArray(inv.body) ? inv.body : (inv.body as { invoices?: unknown[] })?.invoices ?? [];
  const withCae = invoices.filter((i: { cae?: string }) => i.cae).length;
  results.push({
    test: 'Facturas con CAE',
    ok: invoices.length > 0 && withCae === invoices.length,
    detail: `${withCae}/${invoices.length} con CAE`,
  });

  const biz = await get('/api/config/business', cookie);
  results.push({
    test: 'Config empresa',
    ok: biz.status === 200 && !!(biz.body as { businessName?: string })?.businessName,
    detail: (biz.body as { businessName?: string })?.businessName || 'sin nombre',
  });

  const afip = await get('/api/afip/status', cookie);
  results.push({
    test: 'Estado ARCA/AFIP',
    ok: afip.status === 200,
    detail: JSON.stringify(afip.body).slice(0, 120),
  });

  const mp = await get('/api/payments/mercadopago', cookie);
  results.push({
    test: 'MercadoPago configurado',
    ok: mp.status === 200 && (mp.body as { configured?: boolean }).configured === true,
    detail: `configured=${(mp.body as { configured?: boolean }).configured}, qr=${(mp.body as { qrEnabled?: boolean }).qrEnabled}`,
  });

  const keys = await get('/api/config/api-keys', cookie);
  const configs = (keys.body as { configs?: unknown[] })?.configs ?? [];
  results.push({
    test: 'Integraciones guardadas',
    ok: keys.status === 200 && configs.length > 0,
    detail: `${configs.length} integración(es)`,
  });

  const products = await get('/api/products', cookie);
  const prods = Array.isArray(products.body) ? products.body : [];
  results.push({
    test: 'Productos inventario',
    ok: prods.length > 0 && prods.every((p: { name?: string; price?: number }) => p.name && p.price !== undefined),
    detail: `${prods.length} productos`,
  });

  const banks = await get('/api/bank-accounts', cookie);
  const banksArr = Array.isArray(banks.body) ? banks.body : [];
  results.push({
    test: 'Tesorería bancos',
    ok: banks.status === 200 && banksArr.length > 0,
    detail: `${banksArr.length} cuenta(s) — ${(banksArr[0] as { name?: string })?.name || ''}`,
  });

  const chart = await get('/api/chart-accounts', cookie);
  const accounts = Array.isArray(chart.body) ? chart.body : [];
  results.push({
    test: 'Plan de cuentas',
    ok: accounts.length >= 10,
    detail: `${accounts.length} cuentas`,
  });

  const wh = await get('/api/warehouses', cookie);
  results.push({
    test: 'Depósitos',
    ok: wh.status === 200,
    detail: Array.isArray(wh.body) ? `${wh.body.length} depósito(s)` : 'OK',
  });

  const db = await get('/api/health/db', cookie);
  results.push({
    test: 'Base de datos',
    ok: db.status === 200 && (db.body as { ok?: boolean })?.ok === true,
    detail: JSON.stringify(db.body).slice(0, 80),
  });

  console.log('\n=== VALIDACIÓN FUNCIONAL ===');
  let ok = 0, fail = 0;
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.test} — ${r.detail}`);
    if (r.ok) ok++; else fail++;
  }
  console.log(`\n${ok}/${results.length} pruebas funcionales OK`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
