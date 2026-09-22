#!/usr/bin/env bash
set -e

export HOME=/home/emitia
cd "$HOME"

echo "==> [1/6] Descargando micromamba"
mkdir -p "$HOME/bin"
if [ ! -x "$HOME/bin/micromamba" ]; then
  cd "$HOME"
  curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xj bin/micromamba
  chmod +x "$HOME/bin/micromamba"
fi
echo "micromamba: $($HOME/bin/micromamba --version)"

export MAMBA_ROOT_PREFIX="$HOME/micromamba"

echo "==> [2/6] Creando entorno PostgreSQL (puede tardar)"
if [ ! -x "$HOME/pg/bin/initdb" ]; then
  "$HOME/bin/micromamba" create -y -p "$HOME/pg" -c conda-forge "postgresql=16.*"
fi
echo "initdb: $($HOME/pg/bin/initdb --version)"

PGBIN="$HOME/pg/bin"
PGDATA="$HOME/pgdata"

echo "==> [3/6] initdb"
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  "$PGBIN/initdb" -D "$PGDATA" -U emitia --auth=md5 --pwfile=<(echo "emitia_prod_2026") -E UTF8
fi

echo "==> [4/6] Configurando postgresql.conf"
CONF="$PGDATA/postgresql.conf"
sed -i "s/^#*port =.*/port = 5432/" "$CONF"
sed -i "s/^#*listen_addresses =.*/listen_addresses = 'localhost'/" "$CONF"
sed -i "s/^#*shared_buffers =.*/shared_buffers = 96MB/" "$CONF"
sed -i "s/^#*max_connections =.*/max_connections = 30/" "$CONF"
grep -q "^effective_cache_size" "$CONF" || echo "effective_cache_size = 256MB" >> "$CONF"

echo "==> [5/6] Iniciando PostgreSQL"
"$PGBIN/pg_ctl" -D "$PGDATA" -l "$HOME/logs/pg.log" stop 2>/dev/null || true
sleep 1
"$PGBIN/pg_ctl" -D "$PGDATA" -l "$HOME/logs/pg.log" -o "-p 5432" start
sleep 3

echo "==> [6/6] Creando base de datos 'emitia'"
"$PGBIN/psql" -p 5432 -U emitia -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='emitia'" | grep -q 1 || \
  "$PGBIN/psql" -p 5432 -U emitia -d postgres -c "CREATE DATABASE emitia"

echo "==> Estado:"
"$PGBIN/pg_ctl" -D "$PGDATA" status || true
"$PGBIN/psql" -p 5432 -U emitia -d emitia -c "SELECT version();" | head -3

echo "PG_SETUP_DONE"
