param([int]$Port = 4173)
$ErrorActionPreference = 'Stop'
$dist = Join-Path $PSScriptRoot 'dist'
Write-Host "Squadbook: http://127.0.0.1:$Port"
if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 -m http.server $Port --bind 127.0.0.1 --directory $dist
} else {
    & python -m http.server $Port --bind 127.0.0.1 --directory $dist
}
exit $LASTEXITCODE
