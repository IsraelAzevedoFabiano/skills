#!/usr/bin/env bash
set -euo pipefail

# Script de desenvolvimento. Symlinka cada skill deste repo nos diretórios que
# cada harness lê:
#   ~/.claude/skills  (Claude Code)
#   ~/.agents/skills  (Codex e outros compatíveis com Agent Skills)
# Um `git pull` basta para atualizar o que está instalado.
#
# Se o plugin já estiver instalado, desinstale antes para não ficar com as
# skills em duplicidade: claude plugin uninstall israel-skills

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DESTS=("$HOME/.claude/skills" "$HOME/.agents/skills")

names=()
srcs=()
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  names+=("$(basename "$src")")
  srcs+=("$src")
done < <(find "$REPO/skills" -name SKILL.md -print0)

for DEST in "${DESTS[@]}"; do
  # Se $DEST for um symlink que resolve para dentro deste repo, os links
  # por skill acabariam escritos na própria árvore skills/. Aborta.
  if [ -L "$DEST" ]; then
    resolved="$(readlink -f "$DEST")"
    case "$resolved" in
      "$REPO"|"$REPO"/*)
        echo "erro: $DEST é symlink para dentro deste repo ($resolved)." >&2
        echo "Remova-o (rm \"$DEST\") e rode de novo." >&2
        exit 1
        ;;
    esac
  fi

  mkdir -p "$DEST"

  for i in "${!names[@]}"; do
    name="${names[$i]}"
    src="${srcs[$i]}"
    target="$DEST/$name"

    if [ -e "$target" ] && [ ! -L "$target" ]; then
      rm -rf "$target"
    fi

    ln -sfn "$src" "$target"
    echo "linkado $name -> $src ($DEST)"
  done
done
