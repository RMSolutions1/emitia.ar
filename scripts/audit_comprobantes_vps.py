"""Audita comprobantes en BD del VPS usando invoice-print-data."""
import json
import os

import paramiko

PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"

SCRIPT = r"""
const { PrismaClient } = require('@prisma/client');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  const company = await prisma.company.findFirst();
  const mod = await import(path.join(process.cwd(), 'lib/invoice-print-data.ts'));
  const { buildInvoicePrintData, validatePrintData } = mod;

  let ok = 0, warn = 0;
  for (const inv of invoices) {
    const data = buildInvoicePrintData(inv, company || {});
    const issues = validatePrintData(data);
    if (issues.length === 0) ok++;
    else {
      warn++;
      console.log('WARN|' + inv.invoiceNumber + '|' + issues.join('; '));
    }
  }
  console.log('SUMMARY|' + invoices.length + '|' + ok + '|' + warn);
  await prisma.$disconnect();
}
main().catch(e => { console.error('ERR|' + e.message); process.exit(1); });
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("149.50.129.58", 5393, "emitia", PASSWORD, timeout=20, allow_agent=False, look_for_keys=False)

sftp = c.open_sftp()
with sftp.file(f"{BASE}/scripts/_audit_run.mjs", "w") as f:
    f.write(SCRIPT)
sftp.close()

cmd = (
    f"source ~/.nvm/nvm.sh && cd {BASE} && "
    "npx tsx scripts/audit-comprobantes.ts 2>/dev/null || "
    f"node -e \"require('fs').writeFileSync('/tmp/x','')\" && "
    "echo FALLBACK"
)
_, so, se = c.exec_command(f"bash -lc '{cmd}'", timeout=120)
out = so.read().decode("utf-8", "replace")
err = se.read().decode("utf-8", "replace")
print(out or err)
c.close()
