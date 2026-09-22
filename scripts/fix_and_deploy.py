"""Reinicio completo PG + db push + build + restart."""
import os
import paramiko

PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"

SCRIPT = f"""#!/bin/bash
set -e
export HOME=/home/emitia
PGBIN=/home/emitia/pg/bin
PGDATA=/home/emitia/pgdata
pkill -9 -f '/home/emitia/pg/bin/postgres' 2>/dev/null || true
sleep 3
rm -f "$PGDATA/postmaster.pid" /tmp/.s.PGSQL.5432 /tmp/.s.PGSQL.5432.lock
$PGBIN/pg_ctl -D "$PGDATA" -m immediate stop 2>/dev/null || true
sleep 2
$PGBIN/pg_ctl -D "$PGDATA" -l "$HOME/logs/pg.log" -o "-p 5432 -h 127.0.0.1" start
sleep 6
$PGBIN/pg_isready -h 127.0.0.1 -p 5432
cd {BASE}
source ~/.nvm/nvm.sh
npx prisma generate
npx prisma db push --skip-generate
npx tsx scripts/seed-demo-data.ts
npm run build
fuser -k 3001/tcp 2>/dev/null || true
sleep 2
nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 &
sleep 20
curl -s http://127.0.0.1:3001/api/health/db
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("149.50.129.58", 5393, "emitia", PASSWORD, timeout=25, allow_agent=False, look_for_keys=False)
sftp = c.open_sftp()
with sftp.file("/home/emitia/tmp/fix_deploy.sh", "w") as f:
    f.write(SCRIPT)
sftp.close()
_, so, se = c.exec_command("chmod +x /home/emitia/tmp/fix_deploy.sh && bash /home/emitia/tmp/fix_deploy.sh", timeout=3600)
out = so.read().decode("utf-8", "replace")
err = se.read().decode("utf-8", "replace")
print(out[-6000:].encode("ascii", "replace").decode("ascii"))
if err.strip():
    print("ERR:", err[-3000:].encode("ascii", "replace").decode("ascii"))
c.close()
