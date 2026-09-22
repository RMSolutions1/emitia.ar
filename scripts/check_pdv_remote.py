import os
import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]

CMDS = [
    "ls -la /home/emitia/htdocs/www.emitia.com.ar/app/pdv/ 2>&1",
    "ls -la /home/emitia/htdocs/www.emitia.com.ar/components/pdv/ 2>&1",
    "test -f /home/emitia/htdocs/www.emitia.com.ar/app/pdv/page.tsx && echo PAGE_OK || echo PAGE_MISSING",
    "grep pdv /home/emitia/htdocs/www.emitia.com.ar/.next/server/app-paths-manifest.json 2>&1 | head -3",
    "curl -sI http://127.0.0.1:3001/pdv | head -8",
    "tail -n 30 ~/logs/emitia-next.log 2>/dev/null",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=20, allow_agent=False, look_for_keys=False)
for cmd in CMDS:
    print(f"\n=== {cmd} ===")
    _, so, se = c.exec_command(f"bash -lc '{cmd}'", timeout=60)
    print(so.read().decode())
    err = se.read().decode()
    if err.strip():
        print(err[:300])
c.close()
