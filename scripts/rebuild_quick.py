"""Sube archivos clave y rebuild completo."""
import os
from pathlib import Path
import paramiko

PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"
LOCAL = Path(__file__).resolve().parents[1]

FILES = [
    "lib/document-print-data.ts",
    "app/pos/pos-client.tsx",
    "app/presupuestos/presupuestos-client.tsx",
    "app/facturacion/emitir/emitir-factura-client.tsx",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("149.50.129.58", 5393, "emitia", PASSWORD, timeout=25, allow_agent=False, look_for_keys=False)
sftp = c.open_sftp()
for rel in FILES:
    sftp.put(str(LOCAL / rel), f"{BASE}/{rel.replace(chr(92), '/')}")
sftp.close()
_, so, se = c.exec_command(
    f"source ~/.nvm/nvm.sh && cd {BASE} && npm run build && "
    "fuser -k 3001/tcp 2>/dev/null; sleep 2; "
    "nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 & "
    "sleep 22 && curl -s http://127.0.0.1:3001/api/health/db",
    timeout=3600,
)
out = so.read().decode("utf-8", "replace")
err = se.read().decode("utf-8", "replace")
print(out[-4000:].encode("ascii", "replace").decode("ascii"))
if "Failed to compile" in err or "Failed to compile" in out:
    print("BUILD FAIL")
if err.strip():
    print("ERR:", err[-3000:].encode("ascii", "replace").decode("ascii"))
c.close()
