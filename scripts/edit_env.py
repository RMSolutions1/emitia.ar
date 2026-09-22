import os

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
ENV_PATH = "/home/emitia/htdocs/www.emitia.com.ar/.env"

NEW_DB = ("DATABASE_URL='postgresql://emitia:emitia_prod_2026@localhost:5432/"
          "emitia?connect_timeout=15&connection_limit=10'")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
          timeout=20, allow_agent=False, look_for_keys=False)

sftp = c.open_sftp()
with sftp.open(ENV_PATH, "r") as f:
    lines = f.read().decode("utf-8").splitlines()

# backup
with sftp.open(ENV_PATH + ".bak", "w") as f:
    f.write("\n".join(lines) + "\n")

out = []
replaced = False
for ln in lines:
    if ln.strip().startswith("DATABASE_URL"):
        out.append(NEW_DB)
        replaced = True
    else:
        out.append(ln)
if not replaced:
    out.append(NEW_DB)

with sftp.open(ENV_PATH, "w") as f:
    f.write("\n".join(out) + "\n")
sftp.close()

# verify
_, stdout, _ = c.exec_command(
    "bash -lc \"grep -m1 DATABASE_URL " + ENV_PATH + " | sed 's/:[^:@]*@/:****@/'\"",
    timeout=20)
print(stdout.read().decode())
c.close()
