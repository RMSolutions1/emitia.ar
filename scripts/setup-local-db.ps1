Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot '..')

Write-Host '=== EMITIA: PostgreSQL de desarrollo ===' -ForegroundColor Cyan

docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Esperando PostgreSQL...'
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  docker compose exec -T postgres pg_isready -U emitia -d emitia_dev 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 2
}
if (-not $ready) {
  Write-Error 'PostgreSQL no respondió a tiempo.'
}

$localUrl = 'postgresql://emitia:emitia_dev_local@localhost:5434/emitia_dev?connect_timeout=15'
$env:DATABASE_URL = $localUrl

Write-Host 'Aplicando schema...'
npx prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Sembrando datos de prueba...'
npx tsx --require dotenv/config scripts/seed.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host '=== Listo ===' -ForegroundColor Green
Write-Host ''
Write-Host 'DATABASE_URL:'
Write-Host "  $localUrl"
Write-Host ''
Write-Host 'Login de prueba:'
Write-Host '  john@doe.com / johndoe123'
Write-Host '  superadmin@sistema.com / johndoe123'
Write-Host ''
