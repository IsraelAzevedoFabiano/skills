#!/usr/bin/env node
// Politica compartilhada Claude/Codex, 2026-10-21. Recebe JSON, nunca executa
// comandos nem abre arquivos. As copias em template/ sao geradas por sync-guardrails.
// Heuristica para alvos explicitos: nao e sandbox, nao resolve codigo arbitrario,
// links nem buscas amplas. Ferramentas fora dos hooks exigem protecao do SO.
const path = require('node:path');
const EXEMPLOS = new Set(['.env.example', '.env.exemplo', '.env.sample', '.env.template', '.env.dist']);
const SENSIVEL = /^(?:\.env(?:\..*)?|\.envrc|\.netrc|\.pgpass|\.npmrc|\.pypirc|id_rsa|id_dsa|id_ecdsa|id_ed25519|credentials|service[-_]?account.*\.json|secrets?\.(?:json|ya?ml|toml|ini|txt))$|\.(?:pem|key|p12|pfx|jks|keystore|asc|gpg)$/i;
const CAMPOS_CAMINHO = /^(?:file_path|filePath|path|paths|file_paths|filename|file|files|notebook_path|pattern|glob|include|destination|source)$/i;
const CAMPOS_COMANDO = /^(?:command|cmd|script|code)$/i;
const LEITOR = /(?:^|[\s|;&(`$\\/"'])(?:cat|bat|tac|head|tail|less|more|nl|od|xxd|hexdump|strings|base64|openssl|grep|egrep|fgrep|rg|ag|ack|sed|awk|cut|paste|tr|sort|uniq|wc|diff|cmp|cp|mv|scp|rsync|curl|wget|tee|xargs|source|dotenv|env|export|python[\d.]*|py|node|deno|bun|perl|ruby|php|jq|yq|type|Get-Content|gc|Select-String|sls|Copy-Item|Move-Item|Import-Csv)(?:\.exe)?(?=$|[^\w-])/i;

function sensivel(valor) {
  if (typeof valor !== 'string') return false;
  const normal = valor.trim().replace(/^["']|["']$/g, '').replace(/\\/g, '/').replace(/\/+$/, '');
  // ADS do Windows e git show HEAD:caminho: examina tambem o nome apos os dois pontos.
  const nomes = [path.posix.basename(normal), ...normal.split(':').map(p => path.posix.basename(p))];
  return nomes.some(n => {
    const nome = n.replace(/[ .]+$/, '').toLowerCase();
    return !EXEMPLOS.has(nome) && SENSIVEL.test(nome);
  });
}

function patchBloqueado(texto) {
  return texto.split(/\r?\n/).some(linha => {
    const alvo = linha.match(/^\*\*\* (?:Add File|Update File|Delete File|Move to):\s*(.+)$/);
    return alvo && sensivel(alvo[1]);
  });
}

function comandoBloqueado(texto) {
  if (typeof texto !== 'string') return false;
  if (texto.trimStart().startsWith('*** Begin Patch')) return patchBloqueado(texto);
  const leitor = LEITOR.test(texto) || /(?:^|[;&|(`]\s*)\.\s+\S/.test(texto) ||
    /\b(?:ReadAllText|ReadAllLines|ReadAllBytes|readFileSync|readFile|open|read_text|read_bytes)\s*\(/i.test(texto) ||
    /\bgit(?:\.exe)?\s+(?:show|diff|grep|cat-file|archive)\b/i.test(texto);
  if (!leitor) return false;
  // Tokens literais, inclusive strings dentro de Python/JS. Nao avalia expressoes.
  return (texto.match(/[^\s"'`<>(){},;|\[\]]+/g) || []).some(token => sensivel(token.replace(/^[=]+/, '')));
}

function inspecionar(valor, campo = '', profundidade = 0) {
  if (profundidade > 40) return true;
  if (Array.isArray(valor)) return valor.some(v => inspecionar(v, campo, profundidade + 1));
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).some(([k, v]) => inspecionar(v, k, profundidade + 1));
  }
  if (typeof valor !== 'string') return false;
  if (CAMPOS_CAMINHO.test(campo)) return sensivel(valor);
  if (CAMPOS_COMANDO.test(campo)) return comandoBloqueado(valor);
  return false;
}

function negar(motivo) {
  // Nunca ecoa o payload: ele pode conter o proprio segredo.
  process.stdout.write(JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: motivo,
  } }));
}

let bruto = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', trecho => { bruto += trecho; });
process.stdin.on('end', () => {
  try {
    const entrada = JSON.parse(bruto);
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada) ||
        !entrada.tool_input || typeof entrada.tool_input !== 'object' || Array.isArray(entrada.tool_input)) {
      return negar('Hook de segredos: entrada invalida; chamada nao avaliada.');
    }
    if (inspecionar(entrada.tool_input)) {
      negar('Acesso explicito a arquivo de segredo bloqueado. Use o arquivo de exemplo, sem valores reais.');
    }
  } catch {
    negar('Hook de segredos: JSON invalido; chamada nao avaliada.');
  }
});
