import os

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"

CMDS = [
    f"cd {BASE} && source ~/.nvm/nvm.sh && npx tsx scripts/verify-afip-wsfe.ts 2>&1 | head -40",
    (
        f"cd {BASE} && source ~/.nvm/nvm.sh && npx tsx -e "
        "\"import {{ getPersonaFallback }} from './lib/afip/ws-padron'; "
        "getPersonaFallback('20401546228').then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>console.error(e.message));\""
    ),
    "curl -sL -A 'Mozilla/5.0' 'https://www.cuitonline.com/detalle/20401546228/guerrero-silvio-carlos-fabian.html' | grep -iE 'IVA|Monotributo|Actividad|Inicio|IIBB|domicilio|Vespucio|Salta|denominacion' | head -20",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
          timeout=20, allow_agent=False, look_for_keys=False)

for cmd in CMDS:
    print(f"\n=== {cmd[:90]}... ===")
    _, so, se = c.exec_command(f"bash -lc '{cmd}'", timeout=120)
    print(so.read().decode("utf-8", "replace")[:3000])
    err = se.read().decode("utf-8", "replace")
    if err.strip():
        print("ERR:", err[:400])

c.close()
