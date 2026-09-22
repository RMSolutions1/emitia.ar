"""Restart PostgreSQL user install and verify DB."""
import os
import paramiko

PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
CMD = (
    "/home/emitia/pg/bin/pg_ctl -D /home/emitia/pgdata restart -m fast 2>&1; "
    "sleep 4; "
    "/home/emitia/pg/bin/pg_isready -p 5432; "
    "curl -s http://127.0.0.1:3001/api/health/db"
)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("149.50.129.58", 5393, "emitia", PASSWORD, timeout=20, allow_agent=False, look_for_keys=False)
_, so, se = c.exec_command(f"bash -lc '{CMD}'", timeout=120)
print(so.read().decode())
err = se.read().decode()
if err.strip():
    print("ERR:", err)
c.close()
