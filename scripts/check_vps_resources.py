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

cmds = [
    "free -h; nproc; df -h ~ | tail -1",
    "which ollama 2>/dev/null || echo NO_OLLAMA",
    "curl -s --max-time 5 http://127.0.0.1:11434/api/tags 2>/dev/null || echo NO_OLLAMA_API",
]

for cmd in cmds:
    print(f"\n=== {cmd} ===")
    _, so, _ = c.exec_command(f"bash -lc '{cmd}'", timeout=30)
    print(so.read().decode("utf-8", "replace"))

c.close()
