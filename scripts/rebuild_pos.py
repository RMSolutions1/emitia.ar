"""Sube pos-client y rebuild."""
import os
from pathlib import Path
import paramiko

PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"
LOCAL = Path(__file__).resolve().parents[1]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("149.50.129.58", 5393, "emitia", PASSWORD, timeout=25, allow_agent=False, look_for_keys=False)
sftp = c.open_sftp()
sftp.put(str(LOCAL / "app/pos/pos-client.tsx"), f"{BASE}/app/pos/pos-client.tsx")
sftp.close()
_, so, se = c.exec_command(
    f"source ~/.nvm/nvm.sh && cd {BASE} && npm run build && "
    "fuser -k 3001/tcp 2>/dev/null; sleep 2; "
    "nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 & "
    "sleep 20 && curl -s http://127.0.0.1:3001/api/health/db",
    timeout=3600,
)
print(so.read().decode("utf-8", "replace")[-3500:].encode("ascii", "replace").decode("ascii"))
err = se.read().decode("utf-8", "replace")
if err.strip():
    print("ERR:", err[-2500:].encode("ascii", "replace").decode("ascii"))
c.close()
