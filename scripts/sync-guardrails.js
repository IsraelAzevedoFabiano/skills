#!/usr/bin/env node
// Copias autonomas para os dois harnesses; uma unica politica editavel. 2026-10-21.
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const origem = fs.readFileSync(path.join(raiz, 'guardrails/block-secrets.js'));
for (const ferramenta of ['claude', 'codex']) {
  const alvo = path.join(raiz, 'template', '.' + ferramenta, 'hooks/block-secrets.js');
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(alvo) || !fs.readFileSync(alvo).equals(origem)) {
      throw new Error('Copia desatualizada: ' + alvo + '; rode node scripts/sync-guardrails.js');
    }
  } else {
    fs.mkdirSync(path.dirname(alvo), { recursive: true });
    fs.writeFileSync(alvo, origem);
  }
}
console.log('Politica compartilhada: copias Claude e Codex conferidas.');

const instalador = fs.readFileSync(path.join(raiz, 'scripts/install-codex-hooks.js'));
const copia = path.join(raiz, 'template/scripts/install-codex-hooks.js');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(copia) || !fs.readFileSync(copia).equals(instalador)) {
    throw new Error('Instalador copiado desatualizado; rode sync-guardrails.js');
  }
} else fs.writeFileSync(copia, instalador);
