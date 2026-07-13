# Exporta certificados raiz do Windows para docker/certs/
# Necessario apenas se o docker build falhar com erro de TLS/certificado.
# Execute como Administrador se alguns certificados nao forem exportados.

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $projectRoot "docker\certs"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Get-ChildItem $outputDir -Filter *.crt -ErrorAction SilentlyContinue | Remove-Item -Force

$exported = 0

Get-ChildItem Cert:\LocalMachine\Root | ForEach-Object {
  $safeName = "corp-$exported"

  $outputPath = Join-Path $outputDir "$safeName.crt"

  try {
    Export-Certificate -Cert $_ -FilePath $outputPath -Force | Out-Null
    $exported++
  } catch {
    Write-Warning "Nao foi possivel exportar: $($_.Subject)"
  }
}

Write-Host "Exportados $exported certificados para $outputDir"
Write-Host "Execute: docker compose build --no-cache"
