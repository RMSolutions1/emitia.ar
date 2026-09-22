/**
 * Auditoría UX: contenido HTML de cada página autenticada.
 * npx tsx scripts/audit-ux-pages.ts
 */
const BASE = process.env.AUDIT_BASE_URL || 'https://www.emitia.com.ar';
const EMAIL = process.env.AUDIT_LOGIN_EMAIL || '';
const PASSWORD = process.env.AUDIT_LOGIN_PASSWORD || '';

const PAGES: { path: string; area: string; expect?: RegExp }[] = [
  { path: '/dashboard', area: 'Inicio', expect: /Resumen|Dashboard|ventas/i },
  { path: '/bandeja', area: 'Bandeja', expect: /Bandeja|entrada/i },
  { path: '/pdv', area: 'PDV', expect: /Punto de Venta|PDV|Carrito/i },
  { path: '/facturas', area: 'Facturas venta', expect: /Comprobantes|Factura/i },
  { path: '/facturacion/recurrentes', area: 'Facturas recurrentes', expect: /Recurrente/i },
  { path: '/ingresos/cobranzas', area: 'Cobranzas', expect: /Cobranza/i },
  { path: '/facturacion/emitir?documentCode=008', area: 'NC B', expect: /Emitir|Nota/i },
  { path: '/presupuestos', area: 'Presupuestos', expect: /Presupuesto/i },
  { path: '/facturacion/remito', area: 'Remitos', expect: /Remito/i },
  { path: '/facturacion/emitir', area: 'Emitir factura', expect: /Emitir|Comprobante/i },
  { path: '/tickets', area: 'Tickets', expect: /Ticket/i },
  { path: '/gastos/facturas-proveedor', area: 'Facturas proveedor', expect: /Proveedor|Gasto/i },
  { path: '/gastos/pagos', area: 'Pagos', expect: /Pago/i },
  { path: '/compras', area: 'Órdenes compra', expect: /Compra|Orden/i },
  { path: '/facturacion/emitir?documentCode=007', area: 'ND B', expect: /Emitir|Nota/i },
  { path: '/suscripciones', area: 'Suscripciones', expect: /Suscripci/i },
  { path: '/contactos', area: 'Contactos', expect: /Contacto/i },
  { path: '/inventario', area: 'Productos', expect: /Inventario|Producto/i },
  { path: '/inventario/valor', area: 'Valor inventario', expect: /Valor|Inventario/i },
  { path: '/inventario/ajustes', area: 'Ajustes inventario', expect: /Ajuste/i },
  { path: '/inventario/importar', area: 'Importar IA', expect: /Importar|IA/i },
  { path: '/listas-precios', area: 'Listas precios', expect: /Lista|Precio/i },
  { path: '/inventario/depositos', area: 'Depósitos', expect: /Depósito|Almac/i },
  { path: '/inventario/categorias', area: 'Categorías', expect: /Categor/i },
  { path: '/tesoreria', area: 'Bancos y cajas', expect: /Banco|Tesorer/i },
  { path: '/bancos/conciliacion', area: 'Conciliación', expect: /Conciliaci/i },
  { path: '/transacciones', area: 'Transacciones', expect: /Transacci/i },
  { path: '/cuentas-corrientes', area: 'Cuentas corrientes', expect: /Cuenta corriente|Corriente/i },
  { path: '/contabilidad/plan-cuentas', area: 'Plan cuentas', expect: /Plan de cuentas|Cuenta/i },
  { path: '/contabilidad/asientos', area: 'Asientos', expect: /Asiento/i },
  { path: '/contabilidad/libro-diario', area: 'Libro diario', expect: /Libro diario|Diario/i },
  { path: '/libro-iva', area: 'Libro IVA', expect: /Libro IVA|IVA/i },
  { path: '/ventas', area: 'Ventas', expect: /Ventas/i },
  { path: '/reportes', area: 'Reportes', expect: /Reporte/i },
  { path: '/tareas', area: 'Tareas', expect: /Tarea/i },
  { path: '/vendedores', area: 'Vendedores', expect: /Vendedor/i },
  { path: '/contador-ia', area: 'Contador IA', expect: /Contador|IA/i },
  { path: '/configuracion', area: 'Empresa', expect: /Configuraci|Empresa/i },
  { path: '/configuracion/integraciones', area: 'Integraciones', expect: /Integraci|MercadoPago/i },
  { path: '/configuracion/afip', area: 'ARCA/AFIP', expect: /AFIP|ARCA/i },
  { path: '/configuracion/puntos-venta', area: 'Puntos venta', expect: /Punto de venta|Puntos/i },
  { path: '/admin/usuarios', area: 'Usuarios empresa', expect: /Usuario/i },
  { path: '/clientes', area: 'Clientes legacy', expect: /Cliente/i },
  { path: '/proveedores', area: 'Proveedores legacy', expect: /Proveedor/i },
];

type Row = {
  path: string;
  area: string;
  status: 'ok' | 'warn' | 'fail';
  detail: string;
  ux?: string;
};

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

function hasServerError(html: string): boolean {
  if (/Unhandled Runtime Error|hydration failed/i.test(html)) return true;
  if (/"statusCode"\s*:\s*500/.test(html) && /"pageProps"/.test(html)) return true;
  if (/<title>[^<]*(Application error|Internal Server Error)[^<]*<\/title>/i.test(html)) return true;
  if (/This page could not be found/i.test(html) && !html.includes('404')) return true;
  return false;
}

function analyzeHtml(html: string, expect?: RegExp): { status: Row['status']; detail: string; ux: string } {
  const issues: string[] = [];
  if (hasServerError(html)) issues.push('error servidor');
  if (/Unhandled Runtime Error|hydration failed/i.test(html)) issues.push('error React');
  if (html.length < 3000) issues.push('HTML muy corto');
  if (expect && !expect.test(html)) issues.push('falta contenido esperado');
  if (/Próximamente|Coming soon|En construcción/i.test(html)) issues.push('placeholder');
  if (/No hay datos|Sin registros|0 resultados/i.test(html) && !/Comprobantes|Total/i.test(html)) {
    issues.push('estado vacío');
  }
  const hasNav = /Facturas de venta|Punto de Venta|Inventario/i.test(html);
  if (!hasNav) issues.push('sin sidebar ERP');

  const uxNotes: string[] = [];
  if (/text-gray-400 text-xs/.test(html)) uxNotes.push('tipografía secundaria OK');
  if (issues.includes('estado vacío')) uxNotes.push('módulo sin datos demo');

  if (issues.some((i) => i.includes('error'))) {
    return { status: 'fail', detail: issues.join('; '), ux: uxNotes.join(', ') || '-' };
  }
  if (issues.length > 0) {
    return { status: 'warn', detail: issues.join('; '), ux: uxNotes.join(', ') || '-' };
  }
  return { status: 'ok', detail: `${Math.round(html.length / 1024)}KB HTML`, ux: 'render OK' };
}

async function main() {
  const cookie = await getCookie();
  const rows: Row[] = [];

  for (const p of PAGES) {
    const res = await fetch(`${BASE}${p.path}`, { headers: { Cookie: cookie }, redirect: 'follow' });
    const html = await res.text();
    if (res.status >= 400) {
      rows.push({ path: p.path, area: p.area, status: 'fail', detail: `HTTP ${res.status}` });
      continue;
    }
    const { status, detail, ux } = analyzeHtml(html, p.expect);
    rows.push({ path: p.path, area: p.area, status, detail, ux });
  }

  console.log('\n=== AUDITORÍA UX (contenido HTML) ===\n');
  for (const r of rows) {
    const icon = r.status === 'ok' ? '✓' : r.status === 'warn' ? '⚠' : '✗';
    console.log(`${icon} [${r.area}] ${r.path} — ${r.detail}${r.ux ? ` | ${r.ux}` : ''}`);
  }
  const ok = rows.filter((r) => r.status === 'ok').length;
  const warn = rows.filter((r) => r.status === 'warn').length;
  const fail = rows.filter((r) => r.status === 'fail').length;
  console.log(`\n📊 UX: ${ok} OK | ${warn} advertencias | ${fail} fallos | ${rows.length} páginas\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
