"""Compara hashes locales vs VPS para archivos clave."""
import hashlib
import os
import sys
from pathlib import Path

import paramiko

LOCAL = Path(__file__).resolve().parents[1]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"
HOST = os.environ.get("EMITIA_SSH_HOST", "149.50.129.58")
PORT = int(os.environ.get("EMITIA_SSH_PORT", "5393"))
USER = os.environ.get("EMITIA_SSH_USER", "emitia")
PASSWORD = os.environ.get("EMITIA_SSH_PASSWORD", "")

FILES = [
    "app/facturacion/emitir/emitir-factura-client.tsx",
    "app/facturas/facturas-client.tsx",
    "app/api/afip/invoice/route.ts",
    "lib/document-codes.ts",
    "app/api/invoices/route.ts",
    "app/api/config/api-keys/route.ts",
    "lib/mercadopago.ts",
    "app/pos/pos-client.tsx",
    "app/api/payments/mercadopago/route.ts",
    "app/api/payments/mercadopago/status/route.ts",
    "app/api/payments/mercadopago/webhook/route.ts",
    "tsconfig.json",
    "scripts/deploy_definitivo.py",
]


def file_md5(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    if not PASSWORD:
        print("EMITIA_SSH_PASSWORD required", file=sys.stderr)
        sys.exit(1)

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30, allow_agent=False, look_for_keys=False)

    ok = diff = missing = 0
    for rel in FILES:
        local_path = LOCAL / rel.replace("/", os.sep)
        if not local_path.exists():
            print(f"LOCAL_MISSING  {rel}")
            missing += 1
            continue
        lh = file_md5(local_path)
        _, so, _ = c.exec_command(f"md5sum {BASE}/{rel} 2>/dev/null || echo MISSING")
        parts = so.read().decode().strip().split()
        rh = parts[0] if parts and parts[0] != "MISSING" else "MISSING"
        if rh == "MISSING":
            print(f"REMOTE_MISSING {rel}")
            missing += 1
        elif lh == rh:
            print(f"OK             {rel}")
            ok += 1
        else:
            print(f"DIFF           {rel}")
            diff += 1

    _, so, _ = c.exec_command("curl -s http://127.0.0.1:3001/api/health/db")
    health = so.read().decode().strip()
    print(f"\nResumen: {ok} OK | {diff} distintos | {missing} faltantes")
    print(f"Health VPS: {health}")
    c.close()
    sys.exit(1 if diff or missing else 0)


if __name__ == "__main__":
    main()
