/**
 * Audita comprobantes vía API autenticada (ejecutar en VPS o con sesión).
 * Uso: npx tsx scripts/audit-comprobantes.ts
 */
import { buildInvoicePrintData, validatePrintData } from '../lib/invoice-print-data';

type InvoiceRow = Parameters<typeof buildInvoicePrintData>[0];

async function main() {
  const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3001';
  const cookie = process.env.AUDIT_SESSION_COOKIE;

  if (!cookie) {
    console.error('Definir AUDIT_SESSION_COOKIE con la cookie next-auth.session-token');
    process.exit(1);
  }

  const [invRes, cfgRes] = await Promise.all([
    fetch(`${base}/api/invoices`, { headers: { Cookie: cookie } }),
    fetch(`${base}/api/config/business`, { headers: { Cookie: cookie } }),
  ]);

  if (!invRes.ok || !cfgRes.ok) {
    console.error('API error', invRes.status, cfgRes.status);
    process.exit(1);
  }

  const invoices = (await invRes.json()) as InvoiceRow[];
  const business = await cfgRes.json();
  const list = Array.isArray(invoices) ? invoices : (invoices as any).invoices || [];

  let ok = 0;
  let warn = 0;

  for (const inv of list) {
    const data = buildInvoicePrintData(inv, business);
    const issues = validatePrintData(data);
    if (issues.length === 0) {
      ok++;
    } else {
      warn++;
      console.log(`⚠ ${inv.invoiceNumber}: ${issues.join('; ')}`);
    }
  }

  console.log(`\nAudit: ${list.length} comprobantes — ${ok} OK, ${warn} con observaciones`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
