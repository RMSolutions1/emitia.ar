#!/usr/bin/env bash
export HOME=/home/emitia
export PGPASSWORD=emitia_prod_2026
PSQL="$HOME/pg/bin/psql -h 127.0.0.1 -U emitia -d emitia -tA"
echo "== empresas =="
$PSQL -c "SELECT name||' | CUIT '||COALESCE(cuit,'-')||' | '||\"condicionIva\"||' | POS '||\"defaultPOS\"||' | '||status FROM \"Company\";" 2>&1
echo "== usuarios =="
$PSQL -c "SELECT email||' | '||role||' | comp:'||COALESCE(\"companyId\",'-') FROM \"User\" ORDER BY role;" 2>&1
echo "== health app =="
curl -s --max-time 15 https://www.emitia.com.ar/api/health/db
echo ""
echo "DONE"
