#!/usr/bin/env node
// Regressao do instalador: preservar hooks de terceiros, repetir sem duplicar e
// recusar configuracao invalida. So usa pastas temporarias, nunca .env real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { instalar } = require('./install-codex-hooks');
const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'israel-codex-installer-'));
const pasta = path.join(raiz, 'projeto com espacos', '.codex');
fs.mkdirSync(pasta, { recursive: true });
const arquivo = path.join(pasta, 'hooks.json');
const original = { description: 'preservar', hooks: {
  PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo terceiro' }] }],
  Stop: [{ hooks: [{ type: 'command', command: 'echo terminou' }] }],
} };
fs.writeFileSync(arquivo, JSON.stringify(original));
instalar(pasta);
const primeira = fs.readFileSync(arquivo, 'utf8');
const config = JSON.parse(primeira);
assert.equal(config.description, original.description);
assert.deepEqual(config.hooks.Stop, original.hooks.Stop);
assert.deepEqual(config.hooks.PreToolUse[0], original.hooks.PreToolUse[0]);
assert.equal(config.hooks.PreToolUse.length, 2);
assert.equal(config.hooks.PreToolUse[1].matcher, '.*');
assert.match(config.hooks.PreToolUse[1].hooks[0].commandWindows, /^node "/);
assert.ok(fs.existsSync(path.join(pasta, 'hooks/israel-skills/block-secrets.js')));
const backups = fs.readdirSync(pasta).filter(n => n.startsWith('hooks.json.backup-'));
assert.equal(backups.length, 1);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(pasta, backups[0]))), original);
instalar(pasta);
assert.equal(fs.readFileSync(arquivo, 'utf8'), primeira);
assert.equal(fs.readdirSync(pasta).filter(n => n.startsWith('hooks.json.backup-')).length, 1);
fs.writeFileSync(arquivo, 'json-invalido');
assert.throws(() => instalar(pasta));
assert.equal(fs.readFileSync(arquivo, 'utf8'), 'json-invalido');
fs.writeFileSync(arquivo, JSON.stringify({ hooks: { PreToolUse: 'errado' } }));
assert.throws(() => instalar(pasta), /PreToolUse/);
console.log('Instalador: preservacao, backup, idempotencia, espacos e rejeicao de JSON invalido passaram.');
// Pasta pequena de teste preservada para inspecao; nenhuma exclusao recursiva.
console.log('Fixture sintetica: ' + raiz);
