#!/usr/bin/env bash
set -e
export HOME=/home/emitia
PGBIN="$HOME/pg/bin"
export PGPASSWORD="emitia_prod_2026"
export PGDATA="$HOME/pgdata"

# ensure running
if ! "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
  "$PGBIN/pg_ctl" -D "$PGDATA" -l "$HOME/logs/pg.log" -o "-p 5432" start
  sleep 3
fi

EXISTS=$("$PGBIN/psql" -h 127.0.0.1 -p 5432 -U emitia -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='emitia'")
if [ "$EXISTS" != "1" ]; then
  "$PGBIN/psql" -h 127.0.0.1 -p 5432 -U emitia -d postgres -c "CREATE DATABASE emitia"
  echo "DB_CREATED"
else
  echo "DB_EXISTS"
fi

"$PGBIN/psql" -h 127.0.0.1 -p 5432 -U emitia -d emitia -tAc "SELECT 'CONN_OK ' || version();" | head -1
echo "CREATEDB_DONE"
