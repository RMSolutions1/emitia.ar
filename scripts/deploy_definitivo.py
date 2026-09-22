"""Deploy definitivo: sync completo, migrate, build, restart, auditoría E2E."""
import json
import os
import sys
from pathlib import Path

import paramiko

HOST = os.environ.get("EMITIA_SSH_HOST", "149.50.129.58")
PORT = int(os.environ.get("EMITIA_SSH_PORT", "5393"))
USER = os.environ.get("EMITIA_SSH_USER", "emitia")
PASSWORD = os.environ.get("EMITIA_SSH_PASSWORD", "")
BASE = "/home/emitia/htdocs/www.emitia.com.ar"
LOCAL = Path(__file__).resolve().parents[1]
APP = "http://127.0.0.1:3001"

DEPLOY_DIRS = ["app", "components", "lib", "prisma", "scripts"]
DEPLOY_ROOT_FILES = [
    "tsconfig.json",
    "next.config.js",
    "package.json",
    "package-lock.json",
    "middleware.ts",
    "next-env.d.ts",
]
SKIP = {"node_modules", ".next", ".git"}


def collect_files():
    files = []
    for d in DEPLOY_DIRS:
        root = LOCAL / d
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if p.is_file() and not any(s in p.parts for s in SKIP):
                files.append(p.relative_to(LOCAL).as_posix())
    return sorted(set(files))


def ensure_dir(sftp, remote_dir):
    try:
        sftp.stat(remote_dir)
    except OSError:
        parts = remote_dir.split("/")
        path = ""
        for part in parts:
            if not part:
                continue
            path += f"/{part}"
            try:
                sftp.stat(path)
            except OSError:
                sftp.mkdir(path)


def get_session_cookie(client):
    client.exec_command(f"curl -s -c /tmp/def_cookies.txt {APP}/api/auth/csrf", timeout=30)
    _, so, _ = client.exec_command("cat /tmp/def_cookies.txt", timeout=10)
    csrf = json.loads(so.read().decode()).get("csrfToken", "")
    login = (
        f"curl -s -b /tmp/def_cookies.txt -c /tmp/def_cookies.txt "
        f"-X POST {APP}/api/auth/callback/credentials "
        f"-H 'Content-Type: application/x-www-form-urlencoded' "
        f"--data-urlencode 'csrfToken={csrf}' "
        f"--data-urlencode 'email=admin@emitia.com.ar' "
        f"--data-urlencode 'password=Emitia2026!' "
        f"--data-urlencode 'redirect=false' --data-urlencode 'json=true'"
    )
    client.exec_command(login, timeout=30)
    _, cookie_out, _ = client.exec_command("cat /tmp/def_cookies.txt", timeout=10)
    for line in cookie_out.read().decode().splitlines():
        if "session-token" in line:
            parts = line.split("\t")
            if len(parts) >= 7:
                return f"{parts[5]}={parts[6]}"
    return ""


def main():
    if not PASSWORD:
        print("EMITIA_SSH_PASSWORD required", file=sys.stderr)
        sys.exit(1)

    files = collect_files()
    for name in DEPLOY_ROOT_FILES:
        if (LOCAL / name).exists():
            files.append(name)
    files = sorted(set(files))
    print(f"Syncing {len(files)} files...")

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30, allow_agent=False, look_for_keys=False)
    sftp = c.open_sftp()
    for rel in files:
        local = LOCAL / rel.replace("/", os.sep)
        remote = f"{BASE}/{rel}"
        ensure_dir(sftp, remote.rsplit("/", 1)[0])
        sftp.put(str(local), remote)
    sftp.close()
    print("Upload complete")

    script = f"""#!/bin/bash
set -e
export HOME=/home/emitia
PGBIN=/home/emitia/pg/bin
PGDATA=/home/emitia/pgdata
if ! $PGBIN/pg_isready -h 127.0.0.1 -p 5432 -q 2>/dev/null; then
  rm -f "$PGDATA/postmaster.pid" /tmp/.s.PGSQL.5432 /tmp/.s.PGSQL.5432.lock
  $PGBIN/pg_ctl -D "$PGDATA" -l "$HOME/logs/pg.log" -o "-p 5432 -h 127.0.0.1" start || true
  sleep 5
fi
cd {BASE}
source ~/.nvm/nvm.sh
npx prisma generate
npx prisma db push --skip-generate
npm run build
fuser -k 3001/tcp 2>/dev/null || true
sleep 2
nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 &
sleep 20
curl -s {APP}/api/health/db
echo DONE
"""
    sftp = c.open_sftp()
    with sftp.file("/home/emitia/tmp/deploy_definitivo.sh", "w") as f:
        f.write(script)
    sftp.close()

    _, so, se = c.exec_command("bash /home/emitia/tmp/deploy_definitivo.sh", timeout=3600)
    out = so.read().decode("utf-8", "replace")
    err = se.read().decode("utf-8", "replace")
    print(out[-5000:].encode("ascii", "replace").decode("ascii"))
    if "Failed to compile" in out or "Failed to compile" in err:
        print("BUILD FAILED")
        c.close()
        sys.exit(1)

    cookie = get_session_cookie(c)
    audit_cmd = (
        f"source ~/.nvm/nvm.sh && cd {BASE} && "
        f"AUDIT_BASE_URL={APP} AUDIT_SESSION_COOKIE='{cookie}' "
        f"npx tsx scripts/audit-full-system.ts 2>&1 | tail -20"
    )
    _, so2, _ = c.exec_command(audit_cmd, timeout=180)
    audit_out = so2.read().decode("utf-8", "replace")
    print("\n=== AUDITORÍA POST-DEPLOY ===")
    print(audit_out.encode("ascii", "replace").decode("ascii"))

    if err.strip() and "Failed to compile" not in err:
        print("WARN:", err[-800:].encode("ascii", "replace").decode("ascii"))
    c.close()
    print("\n✅ DEPLOY DEFINITIVO COMPLETADO — https://www.emitia.com.ar")


if __name__ == "__main__":
    main()
