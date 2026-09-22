/**
 * Pruebas E2E profundas vía API en producción.
 * npx tsx scripts/audit-e2e-deep.ts
 */
const BASE = 'https://www.emitia.com.ar';
const EMAIL = 'admin@emitia.com.ar';
const PASS = 'Emitia2026!';

type R = { test: string; status: 'ok' | 'warn' | 'fail'; detail: string };

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

async function api(cookie: string, path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { Cookie: cookie, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body: unknown = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* raw */ }
  return { status: res.status, body };
}

async function main() {
  const cookie = await auth();
  const results: R[] = [];
  const tag = Date.now().toString().slice(-6);

  // 1. Dashboard estructura
  const dash = await api(cookie, '/api/dashboard');
  const d = dash.body as Record<string, unknown>;
  const kpis = d.kpis as Record<string, unknown> | undefined;
  results.push({
    test: 'Dashboard devuelve KPIs',
    status: dash.status === 200 && (kpis || d.totalSalesToday !== undefined || d.monthlySales !== undefined) ? 'ok' : 'warn',
    detail: dash.status === 200 ? `keys: ${Object.keys(d).slice(0, 8).join(', ')}` : `HTTP ${dash.status}`,
  });

  // 2. Productos y stock inicial
  const prods = await api(cookie, '/api/products');
  const products = Array.isArray(prods.body) ? prods.body : [];
  const testProduct = products.find((p: { sku?: string }) => p.sku === 'PROD-A') as { id: string; stock: number; price: number; name: string } | undefined;
  results.push({
    test: 'Producto test PROD-A disponible',
    status: testProduct ? 'ok' : 'fail',
    detail: testProduct ? `stock=${testProduct.stock}, $${testProduct.price}` : 'no encontrado',
  });

  if (!testProduct) {
    printResults(results);
    process.exit(1);
  }

  const stockBefore = testProduct.stock;

  // 3. Venta PDV vía API (efectivo)
  const saleTotal = testProduct.price;
  const saleRes = await api(cookie, '/api/sales', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ productId: testProduct.id, quantity: 1, unitPrice: testProduct.price, discount: 0, subtotal: testProduct.price }],
      subtotal: testProduct.price,
      tax: 0,
      total: saleTotal,
      paymentMethod: 'cash',
      discount: 0,
      cashReceived: saleTotal,
      change: 0,
    }),
  });
  const sale = saleRes.body as { id?: string; saleNumber?: string };
  results.push({
    test: 'POST /api/sales — venta efectivo',
    status: saleRes.status === 201 && sale.id ? 'ok' : 'fail',
    detail: sale.saleNumber || JSON.stringify(sale).slice(0, 100),
  });

  // 4. Verificar descuento stock
  const prodsAfter = await api(cookie, '/api/products');
  const productsAfter = Array.isArray(prodsAfter.body) ? prodsAfter.body : [];
  const prodAfter = productsAfter.find((p: { id: string }) => p.id === testProduct.id) as { stock: number };
  results.push({
    test: 'Stock decrementado tras venta',
    status: prodAfter && prodAfter.stock === stockBefore - 1 ? 'ok' : 'fail',
    detail: `${stockBefore} → ${prodAfter?.stock}`,
  });

  // 5. Factura POS con CAE
  if (sale.id) {
    const invRes = await api(cookie, '/api/pos/invoice', {
      method: 'POST',
      body: JSON.stringify({
        saleId: sale.id,
        customerName: 'Consumidor Final E2E',
        customerTaxCondition: 'consumidor_final',
        items: [{ productId: testProduct.id, name: testProduct.name, quantity: 1, unitPrice: testProduct.price, discount: 0 }],
        total: saleTotal,
        subtotal: saleTotal,
        paymentMethod: 'cash',
      }),
    });
    const inv = invRes.body as { success?: boolean; afip?: { success?: boolean; cae?: string }; invoice?: { invoiceNumber?: string }; error?: string };
    results.push({
      test: 'POST /api/pos/invoice — CAE ARCA',
      status: invRes.status === 200 && inv.success && inv.afip?.success && inv.afip?.cae ? 'ok' : 'fail',
      detail: inv.afip?.cae ? `CAE ${inv.afip.cae} — ${inv.invoice?.invoiceNumber}` : (inv.error || inv.afip?.error || JSON.stringify(inv).slice(0, 120)),
    });
  }

  // 6. Presupuesto
  const quoteRes = await api(cookie, '/api/quotes', {
    method: 'POST',
    body: JSON.stringify({
      customerName: `Cliente E2E ${tag}`,
      customerTaxCondition: 'consumidor_final',
      items: [{ description: 'Servicio prueba E2E', quantity: 1, unitPrice: 1000, discount: 0 }],
      subtotal: 1000,
      total: 1000,
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    }),
  });
  const quote = quoteRes.body as { id?: string; quoteNumber?: string };
  results.push({
    test: 'POST /api/quotes — crear presupuesto',
    status: quoteRes.status === 201 || (quoteRes.status === 200 && quote.id) ? 'ok' : 'warn',
    detail: quote.quoteNumber || `HTTP ${quoteRes.status}`,
  });

  // 7. Asiento contable manual
  const accounts = await api(cookie, '/api/chart-accounts');
  const accList = Array.isArray(accounts.body) ? accounts.body : [];
  const caja = accList.find((a: { code?: string }) => a.code === '1.1.01') as { id: string } | undefined;
  const ventas = accList.find((a: { code?: string }) => a.code === '4.1.01') as { id: string } | undefined;
  if (caja && ventas) {
    const jeRes = await api(cookie, '/api/journal-entries', {
      method: 'POST',
      body: JSON.stringify({
        description: `Asiento E2E ${tag}`,
        date: new Date().toISOString().split('T')[0],
        lines: [
          { accountId: caja.id, debit: 500, credit: 0, description: 'Caja' },
          { accountId: ventas.id, debit: 0, credit: 500, description: 'Ventas' },
        ],
      }),
    });
    const je = jeRes.body as { id?: string; entryNumber?: string };
    results.push({
      test: 'POST /api/journal-entries — asiento manual',
      status: jeRes.status === 201 || je.id ? 'ok' : 'fail',
      detail: je.entryNumber || `HTTP ${jeRes.status} — ${JSON.stringify(je).slice(0, 80)}`,
    });
  } else {
    results.push({ test: 'POST /api/journal-entries', status: 'warn', detail: 'Cuentas 1.1.01/4.1.01 no encontradas' });
  }

  // 8. MercadoPago checkout preference
  const mpRes = await api(cookie, '/api/payments/mercadopago', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ name: 'Test E2E MP', quantity: 1, price: 100 }],
      total: 100,
      mode: 'checkout',
    }),
  });
  const mp = mpRes.body as { checkoutUrl?: string; preferenceId?: string; error?: string; needsConfig?: boolean };
  results.push({
    test: 'POST /api/payments/mercadopago — link checkout',
    status: mpRes.status === 200 && mp.checkoutUrl ? 'ok' : mp.needsConfig ? 'fail' : 'warn',
    detail: mp.checkoutUrl ? `pref ${mp.preferenceId?.slice(0, 12)}...` : (mp.error || `HTTP ${mpRes.status}`),
  });

  // 9. MP QR (esperado fallar sin User ID/POS ID)
  const mpQr = await api(cookie, '/api/payments/mercadopago', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ name: 'Test QR', quantity: 1, price: 100 }],
      total: 100,
      mode: 'qr',
    }),
  });
  const mpQrBody = mpQr.body as { qrData?: string; needsQrConfig?: boolean; error?: string };
  results.push({
    test: 'POST /api/payments/mercadopago — QR',
    status: mpQrBody.qrData ? 'ok' : mpQrBody.needsQrConfig ? 'warn' : 'fail',
    detail: mpQrBody.qrData ? 'QR generado' : (mpQrBody.error || 'Requiere User ID + POS ID'),
  });

  // 10. Libro IVA
  const iva = await api(cookie, '/api/libro-iva');
  results.push({
    test: 'GET /api/libro-iva — estructura',
    status: iva.status === 200 ? 'ok' : 'fail',
    detail: typeof iva.body === 'object' ? `keys: ${Object.keys(iva.body as object).join(', ')}` : `HTTP ${iva.status}`,
  });

  // 11. Reportes
  const rep = await api(cookie, '/api/reports');
  results.push({
    test: 'GET /api/reports — datos',
    status: rep.status === 200 ? 'ok' : 'fail',
    detail: rep.status === 200 ? 'OK' : `HTTP ${rep.status}`,
  });

  // 12. Movimientos tesorería
  const mov = await api(cookie, '/api/movements');
  results.push({
    test: 'GET /api/movements — libro diario tesorería',
    status: mov.status === 200 ? 'ok' : 'fail',
    detail: Array.isArray(mov.body) ? `${(mov.body as unknown[]).length} movimientos` : 'OK',
  });

  // 13. Impresión comprobante existente
  const invList = await api(cookie, '/api/invoices');
  const invoices = Array.isArray(invList.body) ? invList.body : (invList.body as { invoices?: unknown[] })?.invoices ?? [];
  const lastInv = invoices[0] as { id?: string; cae?: string; invoiceNumber?: string };
  results.push({
    test: 'Facturas listadas post-E2E',
    status: invoices.length >= 23 && lastInv?.cae ? 'ok' : 'warn',
    detail: `${invoices.length} facturas, última: ${lastInv?.invoiceNumber}`,
  });

  // 14. Health
  const health = await api(cookie, '/api/health/db');
  results.push({
    test: 'Health DB post-operaciones',
    status: health.status === 200 && (health.body as { ok?: boolean }).ok ? 'ok' : 'fail',
    detail: JSON.stringify(health.body),
  });

  printResults(results);
  const fails = results.filter(r => r.status === 'fail').length;
  process.exit(fails > 0 ? 1 : 0);
}

function printResults(results: R[]) {
  console.log('\n=== PRUEBAS E2E PROFUNDAS (API) ===');
  let ok = 0, warn = 0, fail = 0;
  for (const r of results) {
    const icon = r.status === 'ok' ? '✓' : r.status === 'warn' ? '⚠' : '✗';
    console.log(`${icon} ${r.test} — ${r.detail}`);
    if (r.status === 'ok') ok++; else if (r.status === 'warn') warn++; else fail++;
  }
  console.log(`\n📊 E2E API: ${ok} OK | ${warn} advertencias | ${fail} fallos | ${results.length} total`);
}

main().catch(e => { console.error(e); process.exit(1); });
