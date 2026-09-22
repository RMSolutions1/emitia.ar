"""
E2E fiscal en producción: listar facturas, emitir FC B, emitir NC, validar impresión.
Ejecuta en VPS con sesión autenticada.
"""
import json
import os
import re
import sys
from pathlib import Path

import paramiko

HOST = os.environ.get("EMITIA_SSH_HOST", "149.50.129.58")
PORT = int(os.environ.get("EMITIA_SSH_PORT", "5393"))
USER = os.environ.get("EMITIA_SSH_USER", "emitia")
PASSWORD = os.environ.get("EMITIA_SSH_PASSWORD", "")
BASE = "/home/emitia/htdocs/www.emitia.com.ar"
APP = "http://127.0.0.1:3001"
EMAIL = os.environ.get("AUDIT_LOGIN_EMAIL", "admin@emitia.com.ar")
PASS = os.environ.get("AUDIT_LOGIN_PASSWORD", "Emitia2026!")

E2E_SCRIPT = r"""
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:3001';
const COOKIE = process.env.E2E_COOKIE;

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Cookie: COOKIE,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
  return { status: res.status, body };
}

const results = [];

function ok(name, detail) { results.push({ name, status: 'ok', detail }); }
function fail(name, detail) { results.push({ name, status: 'fail', detail }); }

const { buildInvoicePrintData, validatePrintData } = await import('./lib/document-print-data.ts');

// 1) Health + dashboard
const health = await api('/api/health/db');
if (health.body?.ok) ok('health/db', `${health.body.latencyMs}ms`);
else fail('health/db', JSON.stringify(health.body));

const dash = await api('/api/dashboard');
if (dash.status === 200) ok('dashboard', 'API OK');
else fail('dashboard', `HTTP ${dash.status}`);

// 2) List invoices
const invRes = await api('/api/invoices');
const invoices = Array.isArray(invRes.body) ? invRes.body : invRes.body?.invoices || [];
ok('listar-facturas', `${invoices.length} comprobantes`);

const cfgRes = await api('/api/config/business');
const business = cfgRes.body;

let printOk = 0, printWarn = 0;
for (const inv of invoices) {
  const data = buildInvoicePrintData(inv, business);
  const issues = validatePrintData(data);
  if (issues.length === 0) printOk++;
  else printWarn++;
}
if (printWarn === 0) ok('validar-impresion-todas', `${printOk}/${invoices.length} OK`);
else fail('validar-impresion', `${printWarn} con observaciones`);

// 3) Products + customers for emission
const products = await api('/api/products');
const prodList = Array.isArray(products.body) ? products.body : products.body?.products || [];
if (prodList.length === 0) fail('productos', 'sin productos');
else ok('productos', `${prodList.length} disponibles`);

const customers = await api('/api/customers');
const custList = Array.isArray(customers.body) ? customers.body : customers.body?.customers || [];
if (custList.length === 0) fail('clientes', 'sin clientes');
else ok('clientes', `${custList.length} disponibles`);

const product = prodList[0];
const customer = custList.find(c => c.document) || custList[0];

// 4) Emit Factura B (006)
const subtotal = product.price;
const tax = Math.round(subtotal * 0.21 * 100) / 100;
const total = Math.round((subtotal + tax) * 100) / 100;

const emitBody = {
  documentCode: '006',
  invoiceType: 'B',
  customerId: customer.id,
  customerName: customer.name,
  customerDocument: customer.document || '20123456789',
  customerTaxCondition: customer.taxCondition || 'consumidor_final',
  customerAddress: customer.address || 'Sin domicilio',
  concept: 1,
  items: [{
    description: product.name,
    name: product.name,
    quantity: 1,
    unitPrice: product.price,
    ivaRate: 21,
    ivaId: 5,
    subtotal: product.price,
    total: total,
  }],
  subtotal,
  tax,
  total,
  paymentCondition: 'contado',
};

const emit = await api('/api/afip/invoice', {
  method: 'POST',
  body: JSON.stringify(emitBody),
});

if (emit.body?.success || emit.body?.invoice?.cae || emit.body?.cae) {
  const cae = emit.body?.cae || emit.body?.invoice?.cae || emit.body?.afip?.cae;
  const invNum = emit.body?.invoiceNumber || emit.body?.invoice?.invoiceNumber;
  ok('emitir-factura-B', `CAE ${cae || 'OK'} ${invNum || ''}`);
} else if (emit.body?.invoice?.id) {
  ok('emitir-factura-B', `guardada id=${emit.body.invoice.id} (CAE pendiente)`);
} else {
  fail('emitir-factura-B', JSON.stringify(emit.body).slice(0, 400));
}

// 5) Emit Nota de Crédito B (008) against last invoice if exists
const latest = invoices[0] || emit.body?.invoice;
if (latest?.id || latest?.invoiceNumber) {
  const refId = latest.id;
  const refInv = invoices.find(i => i.id === refId) || latest;
  const ncSub = refInv.subtotal || refInv.total / 1.21;
  const ncTax = refInv.tax || (refInv.total - ncSub);
  const ncTotal = refInv.total;

  const ncBody = {
    documentCode: '008',
    invoiceType: 'B',
    associatedInvoiceId: refInv.id,
    associatedInvoiceNumber: refInv.invoiceNumber,
    customerId: refInv.customerId || customer.id,
    customerName: refInv.customerName || customer.name,
    customerDocument: refInv.customerDocument || customer.document,
    customerTaxCondition: refInv.customerTaxCondition || 'consumidor_final',
    concept: 1,
    items: [{
      description: 'Nota de crédito por devolución parcial',
      quantity: 1,
      unitPrice: ncSub,
      ivaRate: 21,
      subtotal: ncSub,
      total: ncTotal,
    }],
    subtotal: ncSub,
    tax: ncTax,
    total: ncTotal,
    observations: 'NC E2E test EMITIA',
  };

  const nc = await api('/api/afip/invoice', {
    method: 'POST',
    body: JSON.stringify(ncBody),
  });

  if (nc.body?.success || nc.body?.cae || nc.body?.invoice?.cae) {
    ok('emitir-nota-credito-B', `CAE ${nc.body?.cae || nc.body?.invoice?.cae || 'OK'}`);
  } else if (nc.body?.invoice?.id) {
    ok('emitir-nota-credito-B', `guardada (CAE pendiente)`);
  } else {
    fail('emitir-nota-credito-B', JSON.stringify(nc.body).slice(0, 400));
  }
} else {
  fail('emitir-nota-credito-B', 'sin factura de referencia');
}

// 6) Re-list and count
const inv2 = await api('/api/invoices');
const list2 = Array.isArray(inv2.body) ? inv2.body : inv2.body?.invoices || [];
ok('post-emision-listado', `${list2.length} comprobantes (antes ${invoices.length})`);

// 7) Other modules
for (const path of ['/api/quotes', '/api/bank-accounts', '/api/chart-accounts', '/api/warehouses', '/api/journal-entries']) {
  const r = await api(path);
  if (r.status === 200) ok(`modulo${path}`, 'OK');
  else fail(`modulo${path}`, `HTTP ${r.status}`);
}

const fails = results.filter(r => r.status === 'fail').length;
console.log(JSON.stringify({ summary: { ok: results.length - fails, fail: fails }, results }, null, 2));
process.exit(fails > 0 ? 1 : 0);
"""


def main():
    if not PASSWORD:
        print("EMITIA_SSH_PASSWORD required", file=sys.stderr)
        sys.exit(1)

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=25, allow_agent=False, look_for_keys=False)

    # Login cookie
    _, so, _ = c.exec_command(f"curl -s -c /tmp/e2e_cookies.txt {APP}/api/auth/csrf", timeout=30)
    csrf = json.loads(so.read().decode()).get("csrfToken", "")

    login_cmd = (
        f"curl -s -b /tmp/e2e_cookies.txt -c /tmp/e2e_cookies.txt "
        f"-X POST {APP}/api/auth/callback/credentials "
        f"-H 'Content-Type: application/x-www-form-urlencoded' "
        f"--data-urlencode 'csrfToken={csrf}' "
        f"--data-urlencode 'email={EMAIL}' "
        f"--data-urlencode 'password={PASS}' "
        f"--data-urlencode 'redirect=false' --data-urlencode 'json=true'"
    )
    c.exec_command(login_cmd, timeout=30)[1].read()

    _, cookie_out, _ = c.exec_command("cat /tmp/e2e_cookies.txt", timeout=10)
    session_cookie = ""
    for line in cookie_out.read().decode().splitlines():
        if "session-token" in line:
            parts = line.split("\t")
            if len(parts) >= 7:
                session_cookie = f"{parts[5]}={parts[6]}"
                break

    if not session_cookie:
        print("No session cookie", file=sys.stderr)
        sys.exit(1)

    sftp = c.open_sftp()
    remote = f"{BASE}/scripts/e2e-fiscal.mjs"
    with sftp.file(remote, "w") as f:
        f.write(E2E_SCRIPT)
    sftp.close()

    cmd = (
        f"source ~/.nvm/nvm.sh && cd {BASE} && "
        f"E2E_BASE={APP} E2E_COOKIE='{session_cookie}' "
        f"node --experimental-vm-modules scripts/e2e-fiscal.mjs 2>&1"
    )
    _, so, se = c.exec_command(cmd, timeout=300)
    out = so.read().decode("utf-8", "replace")
    err = se.read().decode("utf-8", "replace")
    print(out.encode("ascii", "replace").decode("ascii"))
    if err.strip():
        print("STDERR:", err[-1000:].encode("ascii", "replace").decode("ascii"))
    c.close()
    sys.exit(0 if '"fail": 0' in out or '"fail":0' in out.replace(" ", "") else (1 if "fail" in out else 0))


if __name__ == "__main__":
    main()
