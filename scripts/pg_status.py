"""Read postgres log and process status."""
import os
import paramiko

PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
CMDS = [
    "ps aux | grep postgres | grep -v grep",
    "tail -30 /home/emitia/logs/pg.log 2>/dev/null",
    "cat /home/emitia/pgdata/postmaster.pid 2>/dev/null",
    "ls -la /tmp/.s.PGSQL.5432 2>/dev/null || ls -la /home/emitia/pgdata/.s.PGSQL.5432 2>/dev/null",
    "curl -s http://127.0.0.1:3001/api/health/db",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("149.50.129.58", 5393, "emitia", PASSWORD, timeout=20, allow_agent=False, look_for_keys=False)
for cmd in CMDS:
    print(">>>", cmd)
    _, so, _ = c.exec_command(f"bash -lc '{cmd}'", timeout=30)
    print(so.read().decode()[:1500])
c.close()
