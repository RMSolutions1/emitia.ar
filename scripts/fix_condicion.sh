#!/usr/bin/env bash
export HOME=/home/emitia
export PGPASSWORD=emitia_prod_2026
PSQL="$HOME/pg/bin/psql -h 127.0.0.1 -U emitia -d emitia -tA"
$PSQL -c "UPDATE \"Company\" SET \"condicionIva\"='responsable_inscripto' WHERE cuit='20401546228';" 2>&1
$PSQL -c "SELECT name||' | '||\"condicionIva\" FROM \"Company\";" 2>&1
echo "DONE"
