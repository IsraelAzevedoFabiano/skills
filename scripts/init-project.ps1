# Semeia a metodologia em um projeto: plugins de skills e blindagem de segredos.
#
# Uso:  .\scripts\init-project.ps1 [-Destino <caminho>] [-User]
#
#   -Destino  padrao: o diretorio atual
#   -User     instala o hook de segredos tambem em ~/.claude/, valendo para
#             qualquer repositorio desta maquina
#
# Copia template\ para o projeto e roda o setup de la. Idempotente: arquivo ja
# presente e sobrescrito pela versao deste repo, e settings.json e .gitignore
# recebem merge, nunca substituicao.
#
# Depois disto, o projeto se mantem sozinho com scripts\setup-metodologia.ps1.
param(
  [string]$Destino = "",
  [switch]$User
)

$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$template = Join-Path $repo "template"

if ([string]::IsNullOrWhiteSpace($Destino)) { $Destino = (Get-Location).Path }
if (-not (Test-Path $Destino)) {
  Write-Error "O destino $Destino nao existe."
}
$Destino = (Resolve-Path $Destino).Path

if ($Destino -eq $repo -or $Destino.StartsWith($repo + [IO.Path]::DirectorySeparatorChar)) {
  Write-Error "O destino esta dentro deste repo. init-project semeia outro projeto, nao a si mesmo."
}

Write-Host "==> semeando $Destino"
New-Item -ItemType Directory -Force -Path (Join-Path $Destino ".claude\hooks") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Destino "scripts") | Out-Null
Copy-Item -Force -Path (Join-Path $template ".claude\hooks\*") -Destination (Join-Path $Destino ".claude\hooks")
Copy-Item -Force -Path (Join-Path $template "scripts\*") -Destination (Join-Path $Destino "scripts")
Write-Host "  .claude\hooks\  block-secrets.js, casos.txt, test.js"
Write-Host "  scripts\        aplicar-blindagem.js, setup-metodologia.sh, setup-metodologia.ps1"

Write-Host ""
Set-Location $Destino
if ($User) { .\scripts\setup-metodologia.ps1 -User } else { .\scripts\setup-metodologia.ps1 }
