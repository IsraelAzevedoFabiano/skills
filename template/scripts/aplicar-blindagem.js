#!/usr/bin/env node
// Aplica a blindagem de segredos a este projeto. Idempotente: rodar de novo
// nao duplica nada.
//
// Uso:  node scripts/aplicar-blindagem.js [--user]
//
//   sem flag   escreve em <projeto>/.claude/settings.json e no .gitignore do repo
//   --user     alem disso, instala o hook em ~/.claude/ para valer em qualquer
//              repositorio desta maquina
//
// Chamado por scripts/setup-metodologia.(sh|ps1). Nao precisa ser rodado a mao.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const HOOK_ORIGEM = path.join(RAIZ, '.claude', 'hooks', 'block-secrets.js');
const TAMBEM_USER = process.argv.includes('--user');

const DENY = [
  'Read(**/.env)', 'Read(**/.env.*)', 'Read(**/.envrc)',
  'Read(**/*.pem)', 'Read(**/*.key)', 'Read(**/*.p12)', 'Read(**/*.pfx)',
  'Read(**/id_rsa)', 'Read(**/id_ed25519)',
  'Read(**/.netrc)', 'Read(**/.pgpass)', 'Read(**/.npmrc)', 'Read(**/.pypirc)',
  'Read(**/credentials)', 'Read(**/secrets.json)', 'Read(**/secrets.yaml)',
  'Read(**/secrets.yml)',
];

const MATCHER = 'Bash|PowerShell|Read|Edit|Write|NotebookEdit|Glob|Grep';

const GITIGNORE = [
  '# Segredos: nunca versionar',
  '.env',
  '.env.*',
  '!.env.example',
  '!.env.exemplo',
  '!.env.sample',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  'id_rsa',
  'id_ed25519',
  '.netrc',
  '.pgpass',
  'secrets.json',
];

// O shell do hook nem sempre tem node no PATH: fnm e nvm so entram pelo perfil
// do terminal, e o Claude Desktop (modo Code) nao carrega esse perfil. Reserva:
// o node que roda este instalador, pelo caminho real (o do fnm e um atalho por
// sessao, que some).
const NODE_RESERVA = fs.realpathSync(process.execPath).replace(/\\/g, '/');

// Hook que falha ao rodar nao bloqueia: o Claude Code libera a ferramenta.
// O exit 2 inverte isso. Sem hook, nada passa.
function comandoDoHook(script) {
  const reserva = "'" + NODE_RESERVA.replace(/'/g, "'\\''") + "'";
  return 'N="$(command -v node || echo ' + reserva + ')"; "$N" "' + script + '"' +
    " || { echo 'Hook de segredos nao rodou (node ausente?); bloqueado por precaucao.' >&2; exit 2; }";
}

function lerJson(arquivo) {
  if (!fs.existsSync(arquivo)) return {};
  const texto = fs.readFileSync(arquivo, 'utf8').trim();
  if (!texto) return {};
  return JSON.parse(texto);
}

function aplicarSettings(arquivo, comandoHook) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const s = lerJson(arquivo);

  s.permissions = s.permissions || {};
  const deny = new Set(s.permissions.deny || []);
  const antes = deny.size;
  DENY.forEach((r) => deny.add(r));
  s.permissions.deny = [...deny];

  s.hooks = s.hooks || {};
  s.hooks.PreToolUse = s.hooks.PreToolUse || [];
  // Instalacao antiga ("node ..." puro) e reescrita: rodar de novo corrige.
  let atualizou = false;
  const existentes = s.hooks.PreToolUse
    .flatMap((g) => g.hooks || [])
    .filter((h) => String(h.command || '').includes('block-secrets.js'));
  existentes.forEach((h) => {
    if (h.command !== comandoHook) {
      h.command = comandoHook;
      atualizou = true;
    }
  });
  const tinhaHook = existentes.length > 0;
  if (!tinhaHook) {
    s.hooks.PreToolUse.unshift({
      matcher: MATCHER,
      hooks: [{
        type: 'command',
        command: comandoHook,
        shell: 'bash',
        timeout: 10,
        statusMessage: 'Conferindo acesso a segredos...',
      }],
    });
  }

  fs.writeFileSync(arquivo, JSON.stringify(s, null, 2) + '\n');
  const novas = s.permissions.deny.length - antes;
  console.log(
    '  settings  ' + arquivo +
    (!tinhaHook ? ' (hook instalado)' : atualizou ? ' (hook atualizado)' : ' (hook ja estava)') +
    (novas > 0 ? ', +' + novas + ' regras deny' : '')
  );
}

function raizDoGit() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: RAIZ,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return RAIZ; // sem git: usa o proprio projeto
  }
}

function aplicarGitignore() {
  const arquivo = path.join(raizDoGit(), '.gitignore');
  const atual = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '';
  const linhas = new Set(atual.split(/\r?\n/).map((l) => l.trim()));
  const faltando = GITIGNORE.filter((l) => !linhas.has(l));

  if (faltando.length === 0) {
    console.log('  gitignore ' + arquivo + ' (ja cobre os segredos)');
    return;
  }
  const prefixo = atual && !atual.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(arquivo, prefixo + '\n' + faltando.join('\n') + '\n');
  console.log('  gitignore ' + arquivo + ' (+' + faltando.length + ' padroes)');
}

function instalarNoUser() {
  const destino = path.join(os.homedir(), '.claude', 'hooks', 'block-secrets.js');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(HOOK_ORIGEM, destino);
  console.log('  hook      ' + destino);
  aplicarSettings(
    path.join(os.homedir(), '.claude', 'settings.json'),
    comandoDoHook('$HOME/.claude/hooks/block-secrets.js')
  );
}

if (!fs.existsSync(HOOK_ORIGEM)) {
  console.error('erro: ' + HOOK_ORIGEM + ' nao existe.');
  console.error('O hook e a peca que faz o bloqueio; sem ele nao ha o que instalar.');
  process.exit(1);
}

console.log('==> blindagem de segredos');
aplicarSettings(
  path.join(RAIZ, '.claude', 'settings.json'),
  comandoDoHook('$CLAUDE_PROJECT_DIR/.claude/hooks/block-secrets.js')
);
aplicarGitignore();
if (TAMBEM_USER) instalarNoUser();
