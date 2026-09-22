#!/usr/bin/env bash
export HOME=/home/emitia
source "$HOME/.nvm/nvm.sh"
cd "$HOME/htdocs/www.emitia.com.ar"
echo "==> Verificando AFIP/ARCA (solo lectura)"
timeout 90 npx tsx --require dotenv/config scripts/verify-afip-wsfe.ts 2>&1 | head -60
echo "AFIP_VERIFY_DONE"
