import os

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]

PAGES = ["/", "/login", "/registro", "/recuperar-clave", "/privacidad",
         "/terminos", "/cerrar-sesion", "/dashboard"]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
          timeout=20, allow_agent=False, look_for_keys=False)


def run(cmd, timeout=40):
    _, so, se = c.exec_command(f"bash -lc '{cmd}'", timeout=timeout)
    return so.read().decode("utf-8", "replace"), se.read().decode("utf-8", "replace")


print("=== Códigos HTTP por página (vía dominio HTTPS) ===")
for p in PAGES:
    out, _ = run(
        f"curl -ks --max-time 15 -o /dev/null -w '%{{http_code}}' https://www.emitia.com.ar{p}")
    print(f"{p:20s} -> {out.strip()}")

print("\n=== Conteo de usuarios en DB ===")
out, err = run(
    "export PGPASSWORD=emitia_prod_2026; "
    "~/pg/bin/psql -h 127.0.0.1 -U emitia -d emitia -tAc "
    "\"SELECT 'users='||count(*) FROM \\\"User\\\"\" 2>/dev/null || echo PSQL_FAIL")
print(out.strip() or err.strip()[:200])

print("\n=== Errores recientes en log de la app (ultimas 40 lineas con Error) ===")
out, _ = run("grep -i error ~/logs/emitia-next.log 2>/dev/null | tail -n 8 || echo SIN_ERRORES")
print(out.strip() or "SIN_ERRORES")

print("\n=== Procesos y puertos ===")
out, _ = run("ss -tlnp 2>/dev/null | grep -E ':3001|:5432' || echo NO_PORTS")
print(out.strip())

c.close()
