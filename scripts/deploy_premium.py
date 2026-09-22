"""Deploy premium: sube archivos, prisma db push, seed demo, build y restart."""
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
    "prisma/schema.prisma",
    "lib/document-print-data.ts",
    "lib/chart-accounts-default.ts",
    "lib/invoice-print-data.ts",
    "app/api/chart-accounts/route.ts",
    "app/api/warehouses/route.ts",
    "app/api/journal-entries/route.ts",
    "app/api/movements/route.ts",
    "app/api/quotes/[id]/convert/route.ts",
    "app/api/subscriptions/route.ts",
    "app/contabilidad/asientos/asientos-client.tsx",
    "app/contabilidad/plan-cuentas/plan-cuentas-client.tsx",
    "app/contabilidad/libro-diario/libro-diario-client.tsx",
    "app/inventario/depositos/depositos-client.tsx",
    "app/bancos/conciliacion/conciliacion-client.tsx",
    "app/tesoreria/tesoreria-client.tsx",
    "app/presupuestos/presupuestos-client.tsx",
    "app/tickets/tickets-client.tsx",
    "app/facturacion/emitir/emitir-factura-client.tsx",
    "app/facturacion/ticket/emitir-ticket-client.tsx",
    "app/facturacion/remito/emitir-remito-client.tsx",
    "app/pos/pos-client.tsx",
    "scripts/seed-demo-data.ts",
    "scripts/audit-full-system.ts",
]


def ensure_dir(sftp, remote_dir: str):
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


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
              timeout=25, allow_agent=False, look_for_keys=False)
    sftp = c.open_sftp()
    for rel in FILES:
        local = LOCAL / rel
        if not local.exists():
            print(f"SKIP missing {rel}")
            continue
        remote = f"{BASE}/{rel.replace(chr(92), '/')}"
        ensure_dir(sftp, remote.rsplit("/", 1)[0])
        sftp.put(str(local), remote)
        print(f"uploaded {rel}")
    sftp.close()

    cmd = (
        f"source ~/.nvm/nvm.sh && cd {BASE} && "
        "npx prisma generate && npx prisma db push --skip-generate && "
        "npx tsx scripts/seed-demo-data.ts && "
        "npm run build && "
        "fuser -k 3001/tcp 2>/dev/null || true; sleep 2; "
        "nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 & "
        "sleep 15; curl -sI http://127.0.0.1:3001 | head -2"
    )
    _, so, se = c.exec_command(cmd, timeout=3600)
    out = so.read().decode("utf-8", "replace")
    err = se.read().decode("utf-8", "replace")
    print(out[-4000:].encode("ascii", "replace").decode("ascii"))
    if err.strip():
        print("ERR:", err[-1200:].encode("ascii", "replace").decode("ascii"))
    c.close()


if __name__ == "__main__":
    main()
