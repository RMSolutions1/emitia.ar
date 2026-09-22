import os

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]

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

cmd = (
    "export PGPASSWORD=emitia_prod_2026; "
    "~/pg/bin/psql -h 127.0.0.1 -U emitia -d emitia -c "
    "'SELECT name, \\\"legalName\\\", cuit, \\\"condicionIva\\\", iibb, address, city, province, "
    "phone, email, website, \\\"fechaInicioActividad\\\", \\\"actividadPrincipal\\\", \\\"defaultPOS\\\" "
    "FROM \\\"Company\\\";'"
)
_, so, se = c.exec_command(f"bash -lc \"{cmd}\"", timeout=30)
print(so.read().decode("utf-8", "replace"))
err = se.read().decode("utf-8", "replace")
if err.strip():
    print("ERR:", err)
c.close()
