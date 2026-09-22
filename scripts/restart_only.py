"""Restart Next.js app on VPS without sudo."""
import os
import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"

CMD = (
    "fuser -k 3001/tcp 2>/dev/null || true; "
    "pkill -f 'next start' 2>/dev/null || true; "
    "pkill -f 'next-server' 2>/dev/null || true; "
    "sleep 2; "
    f"source ~/.nvm/nvm.sh && cd {BASE} && "
    "mkdir -p ~/logs && nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 & "
    "sleep 12; curl -sI http://127.0.0.1:3001 | head -3"
)


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
              timeout=20, allow_agent=False, look_for_keys=False)
    _, so, se = c.exec_command(f"bash -lc '{CMD}'", timeout=120)
    print(so.read().decode("utf-8", "replace"))
    err = se.read().decode("utf-8", "replace")
    if err.strip():
        print("ERR:", err[-800:])
    c.close()


if __name__ == "__main__":
    main()
