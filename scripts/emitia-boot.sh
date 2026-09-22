#!/usr/bin/env bash
# Watchdog/boot: asegura PostgreSQL y la app Next corriendo.
export HOME=/home/emitia
PGBIN="$HOME/pg/bin"
PGDATA="$HOME/pgdata"
APPDIR="$HOME/htdocs/www.emitia.com.ar"
mkdir -p "$HOME/logs" "$HOME/tmp"

pg_start() {
  rm -f /tmp/.s.PGSQL.5432 /tmp/.s.PGSQL.5432.lock 2>/dev/null || true
  if [ -f "$PGDATA/postmaster.pid" ]; then
    OLD_PID=$(head -1 "$PGDATA/postmaster.pid" 2>/dev/null || true)
    if [ -n "$OLD_PID" ] && ! kill -0 "$OLD_PID" 2>/dev/null; then
      rm -f "$PGDATA/postmaster.pid"
    fi
  fi
  "$PGBIN/pg_ctl" -D "$PGDATA" -l "$HOME/logs/pg.log" -o "-p 5432 -h 127.0.0.1" start
}

# 1) PostgreSQL
if ! "$PGBIN/pg_isready" -h 127.0.0.1 -p 5432 -q 2>/dev/null; then
  pg_start
  sleep 4
fi

# 2) App Next.js en :3001
if ! (ss -tlnp 2>/dev/null | grep -q ':3001'); then
  cd "$APPDIR"
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
  fuser -k 3001/tcp 2>/dev/null || true
  sleep 1
  nohup npm run start -- -p 3001 > "$HOME/logs/emitia-next.log" 2>&1 < /dev/null &
  echo $! > "$HOME/tmp/emitia-next.pid"
fi
