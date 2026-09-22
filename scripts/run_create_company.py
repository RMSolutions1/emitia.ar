import os

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
          timeout=20, allow_agent=False, look_for_keys=False)

sftp = c.open_sftp()
local = os.path.join(os.path.dirname(__file__), "create-company.ts")
sftp.put(local, f"{BASE}/scripts/create-company.ts")
sftp.close()

cmd = (f"cd {BASE} && source ~/.nvm/nvm.sh && "
       "COMPANY_ADMIN_EMAIL='admin@emitia.com.ar' COMPANY_ADMIN_PASSWORD='Emitia2026!' "
       "npx tsx --require dotenv/config scripts/create-company.ts")
_, stdout, stderr = c.exec_command(f"bash -lc \"{cmd}\"", timeout=90)
print(stdout.read().decode("utf-8", "replace").strip())
err = stderr.read().decode("utf-8", "replace")
if err.strip():
    print("ERR:", err.strip()[:600])
c.close()
