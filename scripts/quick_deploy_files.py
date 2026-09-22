"""Sube archivos modificados y rebuild + restart systemd en VPS."""
import os
from pathlib import Path

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"
LOCAL = Path(__file__).resolve().parents[1]

FILES = [
    "components/print-document.tsx",
    "components/pdv/pdv-shell.tsx",
    "app/facturas/facturas-client.tsx",
    "app/api/invoices/send-email/route.ts",
    "app/api/movements/route.ts",
    "app/api/quotes/[id]/convert/route.ts",
    "lib/invoice-print-data.ts",
    "scripts/audit-full-system.ts",
]


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
              timeout=20, allow_agent=False, look_for_keys=False)
    sftp = c.open_sftp()
    for rel in FILES:
        local = LOCAL / rel
        remote = f"{BASE}/{rel.replace(chr(92), '/')}"
        remote_dir = remote.rsplit("/", 1)[0]
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
        sftp.put(str(local), remote)
        print(f"uploaded {rel}")
    # Copiar watchdog al bin del usuario en el servidor
    boot_local = LOCAL / "scripts/emitia-boot.sh"
    boot_remote = "/home/emitia/bin/emitia-boot.sh"
    sftp.put(str(boot_local), boot_remote)
    print("uploaded emitia-boot.sh -> ~/bin/")
    sftp.close()

    cmd = (
        "chmod +x /home/emitia/bin/emitia-boot.sh 2>/dev/null || true; "
        f"chown -R emitia:emitia {BASE}/components {BASE}/lib {BASE}/app 2>/dev/null || true; "
        f"su - emitia -c 'source ~/.nvm/nvm.sh && cd {BASE} && npm run build && "
        "fuser -k 3001/tcp 2>/dev/null || true; sleep 2; "
        "nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 &' "
        "2>/dev/null || "
        f"(source ~/.nvm/nvm.sh && cd {BASE} && npm run build && "
        "fuser -k 3001/tcp 2>/dev/null || true; sleep 2; "
        "nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 &); "
        "sleep 12; curl -sI http://127.0.0.1:3001 | head -2"
    )
    _, so, se = c.exec_command(cmd, timeout=3600)
    out = so.read().decode("utf-8", "replace")
    err = se.read().decode("utf-8", "replace")
    print(out[-3000:].encode("ascii", "replace").decode("ascii"))
    if err.strip():
        print("ERR:", err[-800:].encode("ascii", "replace").decode("ascii"))
    c.close()


if __name__ == "__main__":
    main()
