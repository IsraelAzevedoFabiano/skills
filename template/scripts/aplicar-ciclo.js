#!/usr/bin/env node
// Instala o portao do ciclo (.claude/hooks/ciclo-antes-do-commit.js) neste projeto. Idempotente:
// rodar de novo nao duplica nada, e hook ou regra que o projeto ja tem fica onde esta.
//
// Uso:  node scripts/aplicar-ciclo.js
//
// So no escopo do projeto, de proposito: o portao exige `tdd` antes do codigo, e isso e decisao de
// cada projeto, nao da maquina. Chamado por scripts/setup-metodologia.(sh|ps1).

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const HOOK = path.join(RAIZ, '.claude', 'hooks', 'ciclo-antes-do-commit.js');
const SETTINGS = path.join(RAIZ, '.claude', 'settings.json');

// Mesmo achado do aplicar-blindagem: o shell do hook nem sempre tem node no PATH.
const NODE_RESERVA = fs.realpathSync(process.execPath).replace(/\\/g, '/');

// Ao contrario da blindagem, este portao libera quando nao roda: travar todo commit por falta de
// node seria pior do que deixar um passar sem conferencia.
function comandoDoHook() {
  const reserva = "'" + NODE_RESERVA.replace(/'/g, "'\\''") + "'";
  return 'N="$(command -v node || echo ' + reserva + ')"; "$N" "$CLAUDE_PROJECT_DIR/.claude/hooks/ciclo-antes-do-commit.js" || exit 0';
}

if (!fs.existsSync(HOOK)) {
  console.error('erro: ' + HOOK + ' nao existe.');
  process.exit(1);
}

const s = fs.existsSync(SETTINGS) && fs.readFileSync(SETTINGS, 'utf8').trim()
  ? JSON.parse(fs.readFileSync(SETTINGS, 'utf8'))
  : {};
s.hooks = s.hooks || {};
s.hooks.PreToolUse = s.hooks.PreToolUse || [];

const existentes = s.hooks.PreToolUse
  .flatMap((g) => g.hooks || [])
  .filter((h) => String(h.command || '').includes('ciclo-antes-do-commit.js'));
existentes.forEach((h) => { h.command = comandoDoHook(); });
if (existentes.length === 0) {
  s.hooks.PreToolUse.push({
    matcher: 'Bash|PowerShell',
    hooks: [{
      type: 'command',
      command: comandoDoHook(),
      shell: 'bash',
      timeout: 15,
      statusMessage: 'Conferindo o ciclo antes do commit...',
    }],
  });
}

fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
fs.writeFileSync(SETTINGS, JSON.stringify(s, null, 2) + '\n');
console.log('==> portao do ciclo');
console.log('  settings  ' + SETTINGS + (existentes.length ? ' (hook ja estava)' : ' (hook instalado)'));
