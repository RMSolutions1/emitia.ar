"""Clean restart PostgreSQL when postmaster.pid is stale."""
import os
import paramiko

PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
CMD = (
    "pkill -9 -f '/home/emitia/pg/bin/postgres' 2>/dev/null || true; "
    "sleep 2; "
    "rm -f /home/emitia/pgdata/postmaster.pid /tmp/.s.PGSQL.5432 /tmp/.s.PGSQL.5432.lock; "
    "/home/emitia/pg/bin/pg_ctl -D /home/emitia/pgdata -l /home/emitia/logs/pg.log start; "
    "sleep 4; "
    "/home/emitia/pg/bin/pg_isready -h 127.0.0.1 -p 5432; "
    "curl -s http://127.0.0.1:3001/api/health/db"
)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("149.50.129.58", 5393, "emitia", PASSWORD, timeout=20, allow_agent=False, look_for_keys=False)
_, so, se = c.exec_command(f"bash -lc '{CMD}'", timeout=120)
print(so.read().decode())
if se.read().decode().strip():
    print("ERR:", se.read().decode()[:500])
c.close()
