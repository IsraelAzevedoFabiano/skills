#!/bin/sh
# Remove da mensagem de commit qualquer coautoria ou assinatura de IA.
# Roda como hook global commit-msg (hook.sem-coautoria-ia, Git >= 2.54);
# vale para todo repositório da máquina, inclusive os que usam husky.
# Recebe o caminho do arquivo da mensagem como último argumento.

for arg in "$@"; do msg="$arg"; done
[ -n "$msg" ] && [ -f "$msg" ] || exit 0

tmp="$msg.sem-ia.$$"
awk '
function palavra(s, t,   i, a, b) {
  i = index(s, t)
  while (i > 0) {
    a = (i == 1) ? "" : substr(s, i - 1, 1)
    b = substr(s, i + length(t), 1)
    if (a !~ /[a-z0-9]/ && b !~ /[a-z0-9]/) return 1
    s = substr(s, i + length(t)); i = index(s, t)
  }
  return 0
}
function de_ia(v) {
  return palavra(v, "claude") || palavra(v, "anthropic") || palavra(v, "openai") ||
         palavra(v, "chatgpt") || palavra(v, "codex") || palavra(v, "copilot") ||
         palavra(v, "gemini") || palavra(v, "bard") || palavra(v, "cursor") ||
         palavra(v, "aider") || palavra(v, "windsurf") || palavra(v, "codeium") ||
         palavra(v, "tabnine") || palavra(v, "codewhisperer") || palavra(v, "amazon q") ||
         palavra(v, "sourcegraph") || palavra(v, "devin-ai") || palavra(v, "cognition") ||
         palavra(v, "google-labs-jules") || palavra(v, "llm") || palavra(v, "ai") ||
         palavra(v, "ia") || v ~ /(^|[^a-z0-9])gpt[-0-9a-z.]*/ || v ~ /🤖/
}
{
  l = tolower($0)
  chave = l; sub(/:.*/, "", chave); gsub(/^[ \t]+|[ \t]+$/, "", chave)
  if (l ~ /^[ \t]*[a-z-]+:/ &&
      chave ~ /^(co-authored-by|coauthored-by|co-author|assisted-by|generated-by|signed-off-by|ai-assisted|ai-generated|made-with|helped-by|with-ai)$/ &&
      de_ia(substr(l, index(l, ":") + 1))) next
  if (l ~ /^[ \t]*(🤖[ \t]*)?(generated|created|written|made|co-?authored)[ \t]+(with|by|using)[ \t]/ && de_ia(l)) next
  if (l ~ /^[ \t]*🤖/) next
  linhas[++n] = $0
}
END {
  while (n > 0 && linhas[n] ~ /^[ \t]*$/) n--
  for (i = 1; i <= n; i++) print linhas[i]
}
' "$msg" > "$tmp" && cat "$tmp" > "$msg"
rm -f "$tmp"
exit 0
