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
  if ($LASTEXITCODE -ne 0) { throw "Falha ao configurar marketplace Claude" }
  claude plugin install mattpocock-skills@claude-plugins-official --scope project
  if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar mattpocock-skills no Claude" }
  claude plugin install israel-skills@israel --scope project
  if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar israel-skills no Claude" }
  claude plugin list
} else { Write-Host "Claude CLI ausente; travas preparadas, plugins Claude nao instalados." }
if (Get-Command codex -ErrorAction SilentlyContinue) {
  codex plugin marketplace add IsraelAzevedoFabiano/skills
  if ($LASTEXITCODE -ne 0) { throw "Falha ao configurar marketplace israel no Codex" }
  codex plugin marketplace add anthropics/claude-plugins-official
  if ($LASTEXITCODE -ne 0) { throw "Falha ao configurar marketplace oficial no Codex" }
  codex plugin add israel-skills@israel
  if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar israel-skills no Codex" }
  codex plugin add mattpocock-skills@claude-plugins-official
  if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar mattpocock-skills no Codex" }
} else { Write-Host "Codex CLI ausente; travas preparadas, plugins Codex nao instalados." }
Write-Host "Codex: abra /hooks e revise a confianca antes de contar com o bloqueio."
Write-Host "Bootstrap humano: /setup-matt-pocock-skills, /grill-with-docs, /constituicao."
