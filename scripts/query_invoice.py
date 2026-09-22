import os
import paramiko

HOST = "149.50.129.58"
PORT = 5393
USER = "emitia"
PASSWORD = os.environ.get("EMITIA_SSH_PASSWORD", "")

if not PASSWORD:
    raise SystemExit("Set EMITIA_SSH_PASSWORD")

CMD = f"""cd /home/emitia/htdocs/www.emitia.com.ar && source ~/.nvm/nvm.sh && node -e "
const {{ PrismaClient }} = require('@prisma/client');
const p = new PrismaClient();
p.invoice.findMany({{
  where: {{ OR: [{{ invoiceNumber: {{ contains: '00000010' }} }}, {{ pointOfSale: 6, sequenceNumber: 10 }}] }},
  orderBy: {{ createdAt: 'desc' }},
  take: 5,
  select: {{ id: true, invoiceNumber: true, documentCode: true, customerName: true, customerDocument: true, customerTaxCondition: true, sequenceNumber: true, pointOfSale: true, status: true, cae: true, total: true }}
}}).then(r => {{ console.log(JSON.stringify(r, null, 2)); }}).catch(e => {{ console.error(e); process.exit(1); }}).finally(() => p.\\$disconnect());
" """

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, allow_agent=False, look_for_keys=False, timeout=20)
stdin, stdout, stderr = client.exec_command(f"bash -lc '{CMD}'", timeout=30)
print(stdout.read().decode())
err = stderr.read().decode()
if err.strip():
    print("STDERR:", err)
client.close()
