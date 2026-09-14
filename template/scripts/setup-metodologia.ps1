# Instala a metodologia deste projeto: plugins de skills + blindagem de segredos.
# Idempotente: rodar de novo nao duplica nada.
#
# Uso:  .\scripts\setup-metodologia.ps1 [-User]
#
#   -User  instala o hook de segredos tambem em ~/.claude/, valendo para
#          qualquer repositorio desta maquina
#
# Os plugins tambem sao declarados em .claude\settings.json, entao o Claude Code
# ja os instala ao abrir o projeto. Este script serve para maquina nova sem
# sessao aberta, para CI, e para conferir o estado.
param([switch]$User)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "==> marketplace israel (IsraelAzevedoFabiano/skills)"
claude plugin marketplace add IsraelAzevedoFabiano/skills --scope project

Write-Host "==> plugins"
claude plugin install mattpocock-skills@claude-plugins-official --scope project
claude plugin install israel-skills@israel --scope project

Write-Host ""
if ($User) { node scripts/aplicar-blindagem.js --user } else { node scripts/aplicar-blindagem.js }

Write-Host ""
Write-Host "==> conferindo o bloqueio de segredos"
node .claude/hooks/test.js

Write-Host ""
claude plugin list

Write-Host @"

Falta o bootstrap por repositorio. Em uma sessao do Claude Code, nesta ordem:

  1. /setup-matt-pocock-skills
  2. /grill-with-docs
  3. /constituicao

Sao user-invoked: script nenhum dispara. Ver CLAUDE.md.
"@
