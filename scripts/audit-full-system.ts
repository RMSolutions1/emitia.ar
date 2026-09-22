/**
 * Auditoría integral EMITIA — APIs críticas, comprobantes e integridad de datos.
 * Uso en VPS:
 *   AUDIT_SESSION_COOKIE='...' npx tsx scripts/audit-full-system.ts
 *   AUDIT_BASE_URL=https://www.emitia.com.ar (opcional)
 */
import { buildInvoicePrintData, validatePrintData } from '../lib/invoice-print-data';

const BASE = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3001';
const COOKIE = process.env.AUDIT_SESSION_COOKIE;

type Result = { name: string; status: 'ok' | 'warn' | 'fail'; detail?: string };

const CRITICAL_GET_APIS = [
  '/api/dashboard',
  '/api/invoices',
  '/api/customers',
  '/api/products',
  '/api/sales',
  '/api/quotes',
  '/api/bank-accounts',
  '/api/movements',
  '/api/receipts',
  '/api/payment-orders',
  '/api/suppliers',
  '/api/purchases',
  '/api/remitos',
  '/api/tickets',
  '/api/categories',
  '/api/sellers',
  '/api/reports',
  '/api/libro-iva',
  '/api/config/business',
  '/api/afip/status',
  '/api/health/db',
  '/api/notifications/alerts',
];

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/terminos',
  '/privacidad',
];

const AUTH_PAGES = [
  '/dashboard',
  '/facturas',
  '/clientes',
  '/ventas',
  '/presupuestos',
  '/inventario',
  '/compras',
  '/proveedores',
  '/tesoreria',
  '/bancos/conciliacion',
  '/contabilidad/libro-diario',
  '/contabilidad/plan-cuentas',
  '/contabilidad/asientos',
  '/facturacion/emitir',
  '/facturacion/ticket',
  '/facturacion/remito',
  '/facturacion/recurrentes',
  '/libro-iva',
  '/reportes',
  '/configuracion',
  '/configuracion/afip',
  '/pdv',
  '/pos',
  '/tickets',
  '/cuentas-corrientes',
  '/ingresos/cobranzas',
  '/gastos/pagos',
  '/contador-ia',
  '/listas-precios',
  '/vendedores',
  '/transacciones',
  '/suscripciones',
  '/bandeja',
  '/tareas',
  '/inventario/ajustes',
  '/inventario/valor',
  '/inventario/categorias',
  '/inventario/depositos',
  '/inventario/importar',
  '/contactos',
  '/guias',
];

async function fetchApi(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: COOKIE ? { Cookie: COOKIE } : {},
    redirect: 'manual',
  });
  let body: unknown = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 200);
  }
  return { status: res.status, body };
}

async function fetchPage(path: string): Promise<number> {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return res.status;
}

async function auditApis(): Promise<Result[]> {
  const results: Result[] = [];

  for (const path of CRITICAL_GET_APIS) {
    const { status, body } = await fetchApi(path);
    if (status === 401 && !COOKIE) {
      results.push({ name: path, status: 'warn', detail: '401 sin cookie (esperado)' });
    } else if (status >= 200 && status < 300) {
      const count = Array.isArray(body)
        ? body.length
        : body && typeof body === 'object' && 'invoices' in (body as object)
          ? (body as { invoices: unknown[] }).invoices?.length
          : undefined;
      results.push({
        name: path,
        status: 'ok',
        detail: count !== undefined ? `${count} registros` : `HTTP ${status}`,
      });
    } else if (status === 404) {
      results.push({ name: path, status: 'fail', detail: '404 — ruta inexistente' });
    } else {
      const err =
        body && typeof body === 'object' && 'error' in body
          ? String((body as { error: unknown }).error)
          : `HTTP ${status}`;
      results.push({ name: path, status: status >= 500 ? 'fail' : 'warn', detail: err });
    }
  }

  return results;
}

async function auditInvoices(business: unknown): Promise<Result[]> {
  const { status, body } = await fetchApi('/api/invoices');
  if (status !== 200) {
    return [{ name: 'comprobantes/print', status: 'fail', detail: `invoices HTTP ${status}` }];
  }

  const list = Array.isArray(body) ? body : (body as { invoices?: unknown[] })?.invoices ?? [];
  let ok = 0;
  let warn = 0;
  const samples: string[] = [];

  for (const raw of list) {
    const inv = raw as Parameters<typeof buildInvoicePrintData>[0];
    const data = buildInvoicePrintData(inv, business as Parameters<typeof buildInvoicePrintData>[1]);
    const issues = validatePrintData(data);
    if (issues.length === 0) ok++;
    else {
      warn++;
      if (samples.length < 5) {
        samples.push(`${(inv as { invoiceNumber?: string }).invoiceNumber}: ${issues.join('; ')}`);
      }
    }
  }

  return [
    {
      name: 'comprobantes/print',
      status: warn === 0 ? 'ok' : 'warn',
      detail: `${list.length} total — ${ok} OK, ${warn} observaciones${samples.length ? ` | ${samples.join(' | ')}` : ''}`,
    },
  ];
}

async function auditPages(): Promise<Result[]> {
  const results: Result[] = [];

  for (const path of PUBLIC_PAGES) {
    const status = await fetchPage(path);
    results.push({
      name: `page${path}`,
      status: status >= 200 && status < 400 ? 'ok' : 'fail',
      detail: `HTTP ${status}`,
    });
  }

  if (!COOKIE) {
    results.push({
      name: 'pages/auth',
      status: 'warn',
      detail: 'Omitidas (sin AUDIT_SESSION_COOKIE)',
    });
    return results;
  }

  for (const path of AUTH_PAGES) {
    const status = await fetchPage(path);
    const ok = status >= 200 && status < 400;
    results.push({
      name: `page${path}`,
      status: ok ? 'ok' : status === 307 || status === 302 ? 'warn' : 'fail',
      detail: `HTTP ${status}`,
    });
  }

  return results;
}

function printReport(title: string, items: Result[]) {
  console.log(`\n=== ${title} ===`);
  for (const r of items) {
    const icon = r.status === 'ok' ? '✓' : r.status === 'warn' ? '⚠' : '✗';
    console.log(`${icon} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
}

async function main() {
  console.log(`Auditoría EMITIA — ${BASE}`);
  if (!COOKIE) console.log('(Sin cookie: APIs autenticadas pueden fallar con 401)\n');

  const apiResults = await auditApis();
  printReport('APIs críticas', apiResults);

  let invoiceResults: Result[] = [];
  if (COOKIE) {
    const cfg = await fetchApi('/api/config/business');
    if (cfg.status === 200) {
      invoiceResults = await auditInvoices(cfg.body);
      printReport('Comprobantes', invoiceResults);
    }
  }

  const pageResults = await auditPages();
  printReport('Páginas', pageResults);

  const all = [...apiResults, ...invoiceResults, ...pageResults];
  const fails = all.filter((r) => r.status === 'fail').length;
  const warns = all.filter((r) => r.status === 'warn').length;
  const oks = all.filter((r) => r.status === 'ok').length;

  console.log(`\nRESUMEN: ${oks} OK | ${warns} advertencias | ${fails} fallos`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
