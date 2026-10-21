# Instala as travas Claude/Codex antes dos plugins opcionais. Migracao 2026-10-21.
# -User instala o hook Codex no usuario; sem ele usa o projeto.
param([switch]$User)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
if ($User) { node scripts/aplicar-blindagem.js --user } else { node scripts/aplicar-blindagem.js }
if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar travas Claude" }
if ($User) { node scripts/install-codex-hooks.js --user } else { node scripts/install-codex-hooks.js --project . }
if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar travas Codex" }
node .claude/hooks/test.js
if ($LASTEXITCODE -ne 0) { throw "Falha na regressao Claude" }
if (Get-Command claude -ErrorAction SilentlyContinue) {
  claude plugin marketplace add IsraelAzevedoFabiano/skills --scope project
  claude plugin install mattpocock-skills@claude-plugins-official --scope project
  claude plugin install israel-skills@israel --scope project
  claude plugin list
} else { Write-Host "Claude CLI ausente; travas preparadas, plugins Claude nao instalados." }
Write-Host "Codex: abra /hooks e revise a confianca antes de contar com o bloqueio."
Write-Host "Bootstrap humano: /setup-matt-pocock-skills, /grill-with-docs, /constituicao."
