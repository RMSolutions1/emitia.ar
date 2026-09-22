/**
 * Auditoría completa contra producción (pública + autenticada).
 * npx tsx scripts/audit-production-public.ts
 */
const BASE = process.env.AUDIT_BASE_URL || 'https://www.emitia.com.ar';
const EMAIL = process.env.AUDIT_LOGIN_EMAIL || 'admin@emitia.com.ar';
const PASSWORD = process.env.AUDIT_LOGIN_PASSWORD || 'Emitia2026!';

type Result = { name: string; status: 'ok' | 'warn' | 'fail'; detail?: string };

const PUBLIC_PAGES = ['/', '/login', '/registro', '/terminos', '/privacidad', '/recuperar-clave', '/guias', '/guias/configuracion-afip', '/guias/usuario-cliente'];

const AUTH_PAGES = [
  '/dashboard', '/bandeja', '/pdv', '/facturas', '/facturacion/recurrentes', '/ingresos/cobranzas',
  '/facturacion/emitir', '/facturacion/emitir?documentCode=008', '/presupuestos', '/facturacion/remito',
  '/tickets', '/gastos/facturas-proveedor', '/gastos/pagos', '/compras', '/facturacion/emitir?documentCode=007',
  '/suscripciones', '/contactos', '/inventario', '/inventario/valor', '/inventario/ajustes',
  '/inventario/importar', '/listas-precios', '/inventario/depositos', '/inventario/categorias',
  '/tesoreria', '/bancos/conciliacion', '/transacciones', '/cuentas-corrientes',
  '/contabilidad/plan-cuentas', '/contabilidad/asientos', '/contabilidad/libro-diario', '/libro-iva',
  '/ventas', '/reportes', '/tareas', '/vendedores', '/contador-ia',
  '/configuracion', '/configuracion/integraciones', '/configuracion/afip', '/configuracion/puntos-venta',
  '/clientes', '/proveedores', '/admin', '/admin/dashboard', '/admin/empresas', '/admin/usuarios', '/admin/sistema',
];

const CRITICAL_APIS = [
  '/api/dashboard', '/api/invoices', '/api/customers', '/api/products', '/api/sales', '/api/quotes',
  '/api/bank-accounts', '/api/movements', '/api/receipts', '/api/payment-orders', '/api/suppliers',
  '/api/purchases', '/api/remitos', '/api/tickets', '/api/categories', '/api/sellers', '/api/reports',
  '/api/libro-iva', '/api/config/business', '/api/config/api-keys', '/api/config/sequences',
  '/api/afip/status', '/api/health/db', '/api/notifications/alerts',
  '/api/chart-accounts', '/api/journal-entries', '/api/warehouses',
  '/api/payments/mercadopago', '/api/payments/transactions', '/api/subscriptions',
  '/api/recurring-invoices', '/api/inventory/value', '/api/inventory/adjustments',
];

async function getSessionCookie(): Promise<string> {
  const jar = new Map<string, string>();

  const parseSetCookie = (res: Response) => {
    const raw = res.headers.getSetCookie?.() ?? [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const [k, ...v] = pair.split('=');
      if (k && v.length) jar.set(k.trim(), v.join('=').trim());
    }
  };

  const cookieHeader = () => Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { redirect: 'manual' });
  parseSetCookie(csrfRes);
  const { csrfToken } = await csrfRes.json() as { csrfToken: string };

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(),
    },
    body: new URLSearchParams({
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      redirect: 'false',
      json: 'true',
    }),
    redirect: 'manual',
  });
  parseSetCookie(loginRes);

  const session = jar.get('__Secure-next-auth.session-token') || jar.get('next-auth.session-token');
  if (!session) throw new Error('No se obtuvo cookie de sesión');
  const key = jar.has('__Secure-next-auth.session-token') ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  return `${key}=${session}`;
}

async function fetchPage(path: string, cookie?: string): Promise<number> {
  const res = await fetch(`${BASE}${path}`, {
    redirect: 'manual',
    headers: cookie ? { Cookie: cookie } : {},
  });
  return res.status;
}

async function fetchApi(path: string, cookie: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookie },
    redirect: 'manual',
  });
  const text = await res.text();
  let body: unknown = text.slice(0, 300);
  try { body = text ? JSON.parse(text) : null; } catch { /* text */ }
  return { status: res.status, body };
}

async function main() {
  console.log(`\n🔍 AUDITORÍA COMPLETA EMITIA — ${BASE}\n`);

  const results: Result[] = [];

  // Páginas públicas
  for (const path of PUBLIC_PAGES) {
    const status = await fetchPage(path);
    results.push({
      name: `[PUBLIC] ${path}`,
      status: status >= 200 && status < 400 ? 'ok' : 'fail',
      detail: `HTTP ${status}`,
    });
  }

  let cookie: string;
  try {
    cookie = await getSessionCookie();
    results.push({ name: '[AUTH] Login', status: 'ok', detail: 'Sesión obtenida' });
  } catch (e) {
    results.push({ name: '[AUTH] Login', status: 'fail', detail: String(e) });
    printResults(results);
    process.exit(1);
  }

  // Páginas autenticadas
  for (const path of AUTH_PAGES) {
    const status = await fetchPage(path, cookie);
    const ok = status >= 200 && status < 400;
    results.push({
      name: `[PAGE] ${path}`,
      status: ok ? 'ok' : status === 307 || status === 302 ? 'warn' : 'fail',
      detail: `HTTP ${status}`,
    });
  }

  // APIs
  for (const path of CRITICAL_APIS) {
    const { status, body } = await fetchApi(path, cookie);
    if (status >= 200 && status < 300) {
      let detail = `HTTP ${status}`;
      if (Array.isArray(body)) detail += ` — ${body.length} items`;
      else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        if ('configs' in b && Array.isArray(b.configs)) detail += ` — ${b.configs.length} configs`;
        if ('configured' in b) detail += ` — MP configured: ${b.configured}`;
        if ('invoices' in b && Array.isArray(b.invoices)) detail += ` — ${b.invoices.length} facturas`;
        if ('transactions' in b && Array.isArray(b.transactions)) detail += ` — ${b.transactions.length} tx`;
      }
      results.push({ name: `[API] ${path}`, status: 'ok', detail });
    } else if (status === 403) {
      results.push({ name: `[API] ${path}`, status: 'warn', detail: '403 sin permisos' });
    } else {
      const err = body && typeof body === 'object' && 'error' in (body as object)
        ? String((body as { error: unknown }).error) : `HTTP ${status}`;
      results.push({ name: `[API] ${path}`, status: status >= 500 ? 'fail' : 'warn', detail: err });
    }
  }

  printResults(results);
  const fails = results.filter(r => r.status === 'fail').length;
  process.exit(fails > 0 ? 1 : 0);
}

function printResults(results: Result[]) {
  const sections = ['PUBLIC', 'AUTH', 'PAGE', 'API'];
  for (const sec of sections) {
    const items = results.filter(r => r.name.startsWith(`[${sec}]`));
    if (!items.length) continue;
    console.log(`\n=== ${sec} ===`);
    for (const r of items) {
      const icon = r.status === 'ok' ? '✓' : r.status === 'warn' ? '⚠' : '✗';
      console.log(`${icon} ${r.name.replace(`[${sec}] `, '')}${r.detail ? ` — ${r.detail}` : ''}`);
    }
  }
  const oks = results.filter(r => r.status === 'ok').length;
  const warns = results.filter(r => r.status === 'warn').length;
  const fails = results.filter(r => r.status === 'fail').length;
  console.log(`\n📊 RESUMEN: ${oks} OK | ${warns} advertencias | ${fails} fallos | ${results.length} total`);
}

main().catch(e => { console.error(e); process.exit(1); });
