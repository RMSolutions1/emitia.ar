"""Fix PostgreSQL shared memory issue on VPS."""
import os
import paramiko

PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]

STEPS = [
    "pkill -f '/home/emitia/pg/bin/postgres' 2>/dev/null || true",
    "sleep 2",
    "/home/emitia/pg/bin/pg_ctl -D /home/emitia/pgdata -l /home/emitia/logs/pg.log start",
    "sleep 3",
    "/home/emitia/pg/bin/pg_isready -p 5432",
    "curl -s http://127.0.0.1:3001/api/health/db",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("149.50.129.58", 5393, "emitia", PASSWORD, timeout=20, allow_agent=False, look_for_keys=False)

for step in STEPS:
    print(f">>> {step}")
    _, so, se = c.exec_command(f"bash -lc '{step}'", timeout=60)
    out = so.read().decode("utf-8", "replace")
    err = se.read().decode("utf-8", "replace")
    if out.strip():
        print(out.strip())
    if err.strip():
        print("ERR:", err.strip()[:500])

c.close()
