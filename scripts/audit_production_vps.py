"""Auditoría 100% en producción vía SSH: login, cookie de sesión y audit-full-system."""
import json
import os
import re
import sys
from pathlib import Path

import paramiko

HOST = os.environ.get("EMITIA_SSH_HOST", "149.50.129.58")
PORT = int(os.environ.get("EMITIA_SSH_PORT", "5393"))
USER = os.environ.get("EMITIA_SSH_USER", "emitia")
PASSWORD = os.environ.get("EMITIA_SSH_PASSWORD", "")
BASE = "/home/emitia/htdocs/www.emitia.com.ar"
LOCAL = Path(__file__).resolve().parents[1]

LOGIN_EMAIL = os.environ.get("AUDIT_LOGIN_EMAIL", "admin@emitia.com.ar")
LOGIN_PASSWORD = os.environ.get("AUDIT_LOGIN_PASSWORD", "Emitia2026!")
APP_URL = os.environ.get("AUDIT_BASE_URL", "http://127.0.0.1:3001")


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 120) -> tuple[int, str, str]:
    _, so, se = client.exec_command(cmd, timeout=timeout)
    out = so.read().decode("utf-8", "replace")
    err = se.read().decode("utf-8", "replace")
    code = so.channel.recv_exit_status()
    return code, out, err


def main():
    if not PASSWORD:
        print("Definir EMITIA_SSH_PASSWORD", file=sys.stderr)
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=25, allow_agent=False, look_for_keys=False)

    # Subir script de auditoría
    sftp = client.open_sftp()
    local_audit = LOCAL / "scripts" / "audit-full-system.ts"
    remote_audit = f"{BASE}/scripts/audit-full-system.ts"
    sftp.put(str(local_audit), remote_audit)
    sftp.close()
    print("uploaded audit-full-system.ts")

    # Obtener CSRF + cookie de sesión NextAuth
    csrf_cmd = f"curl -s -c /tmp/emitia_audit_cookies.txt {APP_URL}/api/auth/csrf"
    code, out, err = run(client, csrf_cmd)
    if code != 0:
        print("csrf error", err or out)
        sys.exit(1)

    try:
        csrf = json.loads(out.strip()).get("csrfToken", "")
    except json.JSONDecodeError:
        print("csrf parse error:", out[:300])
        sys.exit(1)

    login_cmd = (
        f"curl -s -b /tmp/emitia_audit_cookies.txt -c /tmp/emitia_audit_cookies.txt "
        f"-X POST {APP_URL}/api/auth/callback/credentials "
        f"-H 'Content-Type: application/x-www-form-urlencoded' "
        f"--data-urlencode 'csrfToken={csrf}' "
        f"--data-urlencode 'email={LOGIN_EMAIL}' "
        f"--data-urlencode 'password={LOGIN_PASSWORD}' "
        f"--data-urlencode 'redirect=false' "
        f"--data-urlencode 'json=true' -w '\\nHTTP:%{{http_code}}'"
    )
    code, out, err = run(client, login_cmd)
    print("login:", out[-200:])

    _, cookie_out, _ = run(client, "cat /tmp/emitia_audit_cookies.txt")
    session_cookie = ""
    for line in cookie_out.splitlines():
        if "session-token" in line:
            parts = line.split("\t")
            if len(parts) >= 7:
                name = parts[5]
                value = parts[6]
                session_cookie = f"{name}={value}"
                break

    if not session_cookie:
        # fallback regex
        m = re.search(r"(next-auth\.session-token[^\s]+)", cookie_out)
        if m:
            session_cookie = m.group(1).replace("\t", "=")

    if not session_cookie:
        print("No se obtuvo cookie de sesión. Cookies:\n", cookie_out[:500])
        sys.exit(1)

    audit_cmd = (
        f"source ~/.nvm/nvm.sh && cd {BASE} && "
        f"AUDIT_BASE_URL={APP_URL} AUDIT_SESSION_COOKIE='{session_cookie}' "
        f"npx tsx scripts/audit-full-system.ts 2>&1"
    )
    code, out, err = run(client, audit_cmd, timeout=300)
    print(out.encode("ascii", "replace").decode("ascii"))
    if err.strip():
        print("stderr:", err[-500:].encode("ascii", "replace").decode("ascii"))
    client.close()
    sys.exit(code)


if __name__ == "__main__":
    main()
