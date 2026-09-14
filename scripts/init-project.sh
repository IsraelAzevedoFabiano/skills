#!/usr/bin/env sh
# Semeia a metodologia em um projeto: plugins de skills e blindagem de segredos.
#
# Uso:  ./scripts/init-project.sh [caminho-do-projeto] [--user]
#
#   caminho-do-projeto  padrao: o diretorio atual
#   --user              instala o hook de segredos tambem em ~/.claude/, valendo
#                       para qualquer repositorio desta maquina
#
# Copia template/ para o projeto e roda o setup de la. Idempotente: arquivo ja
# presente e sobrescrito pela versao deste repo, e settings.json e .gitignore
# recebem merge, nunca substituicao.
#
# Depois disto, o projeto se mantem sozinho com scripts/setup-metodologia.sh.
set -e

REPO="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$REPO/template"

DESTINO=""
USER_FLAG=""
for arg in "$@"; do
  case "$arg" in
    --user) USER_FLAG="--user" ;;
    *) DESTINO="$arg" ;;
  esac
done
[ -z "$DESTINO" ] && DESTINO="$(pwd)"

if [ ! -d "$DESTINO" ]; then
  echo "erro: $DESTINO nao existe." >&2
  exit 1
fi
DESTINO="$(cd "$DESTINO" && pwd)"

case "$DESTINO" in
  "$REPO"|"$REPO"/*)
    echo "erro: o destino esta dentro deste repo ($DESTINO)." >&2
    echo "init-project semeia outro projeto, nao a si mesmo." >&2
    exit 1
    ;;
esac

echo "==> semeando $DESTINO"
mkdir -p "$DESTINO/.claude/hooks" "$DESTINO/scripts"
cp "$TEMPLATE/.claude/hooks/"* "$DESTINO/.claude/hooks/"
cp "$TEMPLATE/scripts/"* "$DESTINO/scripts/"
echo "  .claude/hooks/  block-secrets.js, casos.txt, test.js"
echo "  scripts/        aplicar-blindagem.js, setup-metodologia.sh, setup-metodologia.ps1"

echo
cd "$DESTINO"
sh scripts/setup-metodologia.sh $USER_FLAG
