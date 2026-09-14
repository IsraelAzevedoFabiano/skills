#!/usr/bin/env node
// Hook PreToolUse: nega leitura de arquivos de segredo (.env e afins) por
// qualquer ferramenta do agente, inclusive shell.
//
// Entrada: JSON do hook em stdin. Saida: JSON de deny, ou nada (libera).
// Sem dependencia externa; roda no node do ambiente.

// Nome de arquivo sensivel, como caminho (Read/Edit/Write/Glob/Grep).
const SEGREDO_CAMINHO =
  /(^|[/\\])(\.env(\.[^/\\]*)?|\.envrc|\.netrc|\.pgpass|\.npmrc|\.pypirc|id_rsa|id_dsa|id_ecdsa|id_ed25519|credentials|service[-_]?account[^/\\]*\.json|secrets?\.(json|ya?ml|toml|ini|txt))$|\.(pem|p12|pfx|jks|keystore|asc|gpg)$/i;

// Mesmo alvo, solto dentro de uma linha de comando de shell.
const SEGREDO_COMANDO =
  /(^|[\s"'=(:,/\\])(\.env(\.[A-Za-z0-9_.-]+)?|\.envrc|\.netrc|\.pgpass|\.npmrc|\.pypirc|id_rsa|id_dsa|id_ecdsa|id_ed25519)(?![A-Za-z0-9_-])|[^\s"']+\.(pem|p12|pfx|jks|keystore)(?![A-Za-z0-9])/gi;

// Comandos que de fato leem conteudo. Fora desta lista o comando apenas cita o
// nome do arquivo (echo .env >> .gitignore, git add, ls, find) e passa.
const LEITORES =
  /(^|[\s|;&(`$])(cat|bat|tac|head|tail|less|more|nl|od|xxd|hexdump|strings|base64|openssl|grep|egrep|fgrep|rg|ag|ack|sed|awk|cut|paste|tr|sort|uniq|wc|diff|cmp|cp|mv|scp|rsync|curl|wget|tee|xargs|source|dotenv|env|export|python|python3|node|deno|bun|perl|ruby|php|jq|yq|type|Get-Content|gc|Select-String|sls|Copy-Item|Move-Item|Import-Csv)(?![A-Za-z0-9_-])/i;

// O comando `.` (source) so conta em posicao de comando: em "find . -name" o
// ponto e argumento, nao leitor.
const SOURCE_PONTO = /(^|[;&|(`]\s*)\.\s+\S/;

// Arquivo de exemplo nao carrega segredo: .env.example, .env.exemplo, .env.sample.
const EXEMPLO = /(example|exemplo|sample|template|dist|\.md)$/i;

function alvoBloqueado(valor) {
  if (typeof valor !== 'string' || !valor) return null;
  const limpo = valor.replace(/["']/g, '');
  if (!SEGREDO_CAMINHO.test(limpo)) return null;
  if (EXEMPLO.test(limpo)) return null;
  return limpo;
}

function alvoNoComando(comando) {
  if (typeof comando !== 'string' || !comando) return null;
  if (!LEITORES.test(comando) && !SOURCE_PONTO.test(comando)) return null;
  SEGREDO_COMANDO.lastIndex = 0;
  let m;
  while ((m = SEGREDO_COMANDO.exec(comando)) !== null) {
    const achado = m[0].replace(/^[\s"'=(:,]+/, '');
    if (!EXEMPLO.test(achado)) return achado;
  }
  return null;
}

function negar(alvo) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          'Bloqueado: "' +
          alvo +
          '" e arquivo de segredo. O agente nao le .env nem credenciais neste ' +
          'ambiente. Peca ao humano o valor especifico de que precisa, ou use o ' +
          'arquivo de exemplo correspondente.',
      },
      systemMessage: 'Acesso a segredo bloqueado: ' + alvo,
    })
  );
  process.exit(0);
}

let bruto = '';
process.stdin.on('data', (d) => (bruto += d));
process.stdin.on('end', () => {
  let entrada;
  try {
    entrada = JSON.parse(bruto);
  } catch {
    process.exit(0); // sem JSON valido nao ha o que avaliar
  }
  const ti = entrada.tool_input || {};

  for (const campo of ['file_path', 'path', 'notebook_path', 'pattern']) {
    const alvo = alvoBloqueado(ti[campo]);
    if (alvo) negar(alvo);
  }
  for (const campo of ['command', 'script']) {
    const alvo = alvoNoComando(ti[campo]);
    if (alvo) negar(alvo);
  }
  process.exit(0);
});
