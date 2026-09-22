import os
import shlex

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(
    HOST,
    port=PORT,
    username=USER,
    password=PASSWORD,
    timeout=20,
    allow_agent=False,
    look_for_keys=False,
)

cmds = [
    f"grep -E '^(OPENAI|ANTHROPIC|GEMINI)_API_KEY=' {BASE}/.env 2>/dev/null | sed 's/=.*$/=***/'",
    f"cd {BASE} && source ~/.nvm/nvm.sh && npm run verify 2>&1",
    "grep -i 'Import Document\\|LLM API\\|Gemini\\|OpenAI' ~/logs/emitia-next.log 2>/dev/null | tail -15",
]

for cmd in cmds:
    print(f"\n=== {cmd[:100]} ===")
    _, so, se = c.exec_command(f"bash -lc {shlex.quote(cmd)}", timeout=180)
    so.channel.settimeout(180)
    se.channel.settimeout(30)
    out = so.read().decode("utf-8", "replace")[:4000]
    print(out)
    err = se.read().decode("utf-8", "replace")
    if err.strip():
        print("ERR:", err[:400])
    code = so.channel.recv_exit_status()
    print(f"exit={code}")

c.close()
