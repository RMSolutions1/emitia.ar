import os

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]

CMDS = [
    "curl -ks --max-time 15 -o /dev/null -w 'apex_code:%{http_code}\\n' https://emitia.com.ar/",
    "curl -ks --max-time 15 -o /dev/null -w 'www_code:%{http_code}\\n' https://www.emitia.com.ar/",
    "curl -ks --max-time 15 https://www.emitia.com.ar/login | grep -o 'Bienvenido de vuelta' | head -1 || echo NO_MATCH_LOGIN",
    "curl -ks --max-time 15 https://www.emitia.com.ar/api/health/db",
    "ls -la /etc/nginx/sites-enabled/ 2>/dev/null | head; echo '---vhost grep---'; grep -rl 'emitia' /etc/nginx 2>/dev/null | head",
]


def main() -> int:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
              timeout=20, allow_agent=False, look_for_keys=False)
    for cmd in CMDS:
        _, stdout, stderr = c.exec_command(f"bash -lc '{cmd}'", timeout=40)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        print(f"\n=== {cmd[:55]} ===")
        if out.strip():
            print(out.strip())
        if err.strip():
            print("ERR:", err.strip()[:300])
    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
