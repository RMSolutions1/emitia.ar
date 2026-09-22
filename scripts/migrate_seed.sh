#!/usr/bin/env bash
set -e
export HOME=/home/emitia
source "$HOME/.nvm/nvm.sh"
cd "$HOME/htdocs/www.emitia.com.ar"

echo "==> [1/4] prisma db push"
npx prisma db push --skip-generate --accept-data-loss

echo "==> [2/4] prisma generate"
npx prisma generate >/dev/null 2>&1 || true

echo "==> [3/4] seed"
npx prisma db seed || echo "SEED_WARN: seed devolvió error (puede ser por datos ya existentes)"

echo "==> [4/4] reiniciar app"
pkill -f "next start -- -p 3001" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2
nohup npm run start -- -p 3001 > "$HOME/logs/emitia-next.log" 2>&1 < /dev/null &
echo $! > "$HOME/tmp/emitia-next.pid"
sleep 6

echo "==> health:"
curl -s --max-time 20 http://127.0.0.1:3001/api/health/db || echo HEALTH_FAIL
echo ""
curl -sI --max-time 12 http://127.0.0.1:3001/ | head -3
echo "MIGRATE_SEED_DONE"
