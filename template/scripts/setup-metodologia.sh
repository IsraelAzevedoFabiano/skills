#!/usr/bin/env sh
# Travas compartilhadas antes dos plugins opcionais. Migracao 2026-10-21.
set -e
cd "$(dirname "$0")/.."
node scripts/aplicar-blindagem.js "$@"
case " $* " in
  *' --user '*) node scripts/install-codex-hooks.js --user ;;
  *) node scripts/install-codex-hooks.js --project . ;;
esac
node .claude/hooks/test.js
if command -v claude >/dev/null 2>&1; then
  claude plugin marketplace add IsraelAzevedoFabiano/skills --scope project || true
  claude plugin install mattpocock-skills@claude-plugins-official --scope project || true
  claude plugin install israel-skills@israel --scope project || true
  claude plugin list
else
  echo 'Claude CLI ausente; travas preparadas, plugins Claude nao instalados.'
fi
echo 'Codex: abra /hooks e revise a confianca antes de contar com o bloqueio.'
echo 'Bootstrap humano: /setup-matt-pocock-skills, /grill-with-docs, /constituicao.'
