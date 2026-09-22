import os

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
          timeout=20, allow_agent=False, look_for_keys=False)

cmd = (
    "fuser -k 3001/tcp 2>/dev/null || true; "
    "pkill -f 'next-server' 2>/dev/null || true; "
    "pkill -f 'next start' 2>/dev/null || true; "
    "sleep 3; "
    "cd /home/emitia/htdocs/www.emitia.com.ar && source ~/.nvm/nvm.sh && "
    "nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 < /dev/null & "
    "sleep 10; ss -tlnp 2>/dev/null | grep ':3001' || echo NO_PORT; "
    "curl -sI --max-time 10 http://127.0.0.1:3001/pdv | head -8; "
    "tail -n 15 ~/logs/emitia-next.log"
)
_, so, se = c.exec_command(f"bash -lc '{cmd}'", timeout=60)
print(so.read().decode("utf-8", "replace"))
print(se.read().decode("utf-8", "replace")[:300])
c.close()
