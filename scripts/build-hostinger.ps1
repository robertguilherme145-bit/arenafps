$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root "frontend"
$backend = Join-Path $root "backend"
$deploy = Join-Path $root "deploy"
$stage = Join-Path $deploy "hostinger"
$archive = Join-Path $deploy "hostinger.zip"

Write-Host "Compilando frontend..."
Push-Location $frontend
try {
  npm run build
} finally {
  Pop-Location
}

if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
if (Test-Path $archive) { Remove-Item -LiteralPath $archive -Force }

New-Item -ItemType Directory -Path $stage | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage "public") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage "uploads") | Out-Null

Copy-Item -LiteralPath (Join-Path $backend "src") -Destination $stage -Recurse
Copy-Item -LiteralPath (Join-Path $backend "package.json") -Destination $stage
Copy-Item -LiteralPath (Join-Path $backend "package-lock.json") -Destination $stage
Copy-Item -Path (Join-Path $frontend "dist\*") -Destination (Join-Path $stage "public") -Recurse
Copy-Item -LiteralPath (Join-Path $backend "uploads\.gitkeep") -Destination (Join-Path $stage "uploads")

Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $archive -CompressionLevel Optimal

Write-Host "Pacote criado em: $archive"
