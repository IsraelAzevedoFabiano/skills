# Verifica o comando unico com CLIs simulados, sem instalar plugins nem abrir segredos.
# 2026-10-21: regressao da integracao Claude/Codex.
$ErrorActionPreference = 'Stop'
$repoTeste = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$destinoTeste = Join-Path ([IO.Path]::GetTempPath()) ('skills-setup-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $destinoTeste | Out-Null
$chamadasTeste = [Collections.Generic.List[string]]::new()
function claude { $chamadasTeste.Add('claude ' + ($args -join ' ')); $global:LASTEXITCODE = 0 }
function codex { $chamadasTeste.Add('codex ' + ($args -join ' ')); $global:LASTEXITCODE = 0 }
try {
  & (Join-Path $repoTeste 'scripts/init-project.ps1') -Destino $destinoTeste
  foreach ($arquivo in @('.claude/settings.json', '.codex/hooks.json', '.codex/hooks/block-secrets.js')) {
    if (-not (Test-Path -LiteralPath (Join-Path $destinoTeste $arquivo))) { throw "Ausente: $arquivo" }
  }
  foreach ($comando in @(
    'claude plugin install israel-skills@israel --scope project',
    'claude plugin install mattpocock-skills@claude-plugins-official --scope project',
    'codex plugin add israel-skills@israel',
    'codex plugin add mattpocock-skills@claude-plugins-official'
  )) {
    if ($chamadasTeste -notcontains $comando) { throw "Nao executou: $comando" }
  }
  # Repetir a instalacao preserva as configuracoes sem duplicar a trava.
  & (Join-Path $repoTeste 'scripts/init-project.ps1') -Destino $destinoTeste
  $hooks = Get-Content -Raw -LiteralPath (Join-Path $destinoTeste '.codex/hooks.json') | ConvertFrom-Json
  if (@($hooks.hooks.PreToolUse).Count -ne 1) { throw 'Hook duplicado' }
  Write-Host 'Comando unico: plugins dos dois CLIs, travas e repeticao conferidos com dublês.'
} finally { Set-Location -LiteralPath $repoTeste }
