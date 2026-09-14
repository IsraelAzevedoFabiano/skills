#!/usr/bin/env sh
# Instala a metodologia deste projeto: plugins de skills + blindagem de segredos.
# Idempotente: rodar de novo nao duplica nada.
#
# Uso:  sh scripts/setup-metodologia.sh [--user]
#
#   --user  instala o hook de segredos tambem em ~/.claude/, valendo para
#           qualquer repositorio desta maquina
#
# Os plugins tambem sao declarados em .claude/settings.json, entao o Claude Code
# ja os instala ao abrir o projeto. Este script serve para maquina nova sem
# sessao aberta, para CI, e para conferir o estado.
set -e

cd "$(dirname "$0")/.."

echo "==> marketplace israel (IsraelAzevedoFabiano/skills)"
claude plugin marketplace add IsraelAzevedoFabiano/skills --scope project || true

echo "==> plugins"
claude plugin install mattpocock-skills@claude-plugins-official --scope project || true
claude plugin install israel-skills@israel --scope project || true

echo
node scripts/aplicar-blindagem.js "$@"

echo
echo "==> conferindo o bloqueio de segredos"
node .claude/hooks/test.js

echo
claude plugin list

cat <<'FIM'

Falta o bootstrap por repositorio. Em uma sessao do Claude Code, nesta ordem:

  1. /setup-matt-pocock-skills
  2. /grill-with-docs
  3. /constituicao

Sao user-invoked: script nenhum dispara. Ver CLAUDE.md.
FIM
