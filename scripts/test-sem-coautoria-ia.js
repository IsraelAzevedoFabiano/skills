#!/usr/bin/env node
// Prova o sem-coautoria-ia num HOME descartavel: instala duas vezes, commita de verdade e confere
// que credito de IA sai e coautor humano fica. Metade dos casos e preservacao: filtro que come
// trailer de gente e desligado pelo dono.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sem-coautoria-'));
const env = {
  ...process.env,
  HOME: home,
  USERPROFILE: home,
  SEM_COAUTORIA_HOME: home,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Teste', GIT_AUTHOR_EMAIL: 'teste@exemplo.invalid',
  GIT_COMMITTER_NAME: 'Teste', GIT_COMMITTER_EMAIL: 'teste@exemplo.invalid',
};
delete env.GIT_CONFIG_GLOBAL;
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, env, encoding: 'utf8' });
const instalador = path.join(__dirname, 'sem-coautoria-ia.js');

fs.mkdirSync(path.join(home, '.claude'));
fs.writeFileSync(path.join(home, '.claude', 'settings.json'), '{"model":"x"}');
fs.writeFileSync(path.join(home, '.claude', 'CLAUDE.md'), '# Minhas regras\n');
run('node', [instalador]);
run('node', [instalador]);

const settings = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'));
assert.strictEqual(settings.model, 'x', 'settings.json perdeu chave existente');
assert.deepStrictEqual(settings.attribution, { commit: '', pr: '' });
const claudeMd = fs.readFileSync(path.join(home, '.claude', 'CLAUDE.md'), 'utf8');
assert.ok(claudeMd.startsWith('# Minhas regras\n'), 'CLAUDE.md perdeu conteudo do dono');
assert.strictEqual(claudeMd.split('sem-coautoria-ia:inicio').length, 2, 'bloco duplicado');
assert.ok(fs.existsSync(path.join(home, '.codex', 'AGENTS.md')));

const removidos = [
  'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>',
  'Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>',
  'Co-authored-by: Codex <codex@openai.com>',
  'co-authored-by: Cursor Agent <cursoragent@cursor.com>',
  'Assisted-by: Gemini',
  'Signed-off-by: aider (gpt-4o)',
  'Generated-by: ChatGPT',
  '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
  'Generated with Codex',
];
const mantidos = [
  'Co-authored-by: Claudemir Souza <claudemir@exemplo.invalid>',
  'Co-authored-by: Maria Claudete <mc@exemplo.invalid>',
  'Signed-off-by: Ana Lima <ana@exemplo.invalid>',
  'Refs: #12',
];

function commitar(repo, sufixo) {
  fs.writeFileSync(path.join(repo, 'f.txt'), sufixo);
  run('git', ['add', 'f.txt'], repo);
  const corpo = ['feat: algo ' + sufixo, '', 'Explica o Claude Code no texto.', '', ...mantidos, ...removidos];
  run('git', ['commit', '-q', '-m', corpo.join('\n')], repo);
  return run('git', ['log', '-1', '--format=%B'], repo);
}

function conferir(msg, caso) {
  for (const l of removidos) assert.ok(!msg.includes(l), `${caso}: ficou "${l}"`);
  for (const l of mantidos) assert.ok(msg.includes(l), `${caso}: sumiu "${l}"`);
  assert.ok(msg.includes('Explica o Claude Code no texto.'), `${caso}: corpo alterado`);
}

const simples = path.join(home, 'simples');
fs.mkdirSync(simples);
run('git', ['init', '-q'], simples);
conferir(commitar(simples, 'simples'), 'repo comum');

// husky: core.hooksPath local com o proprio commit-msg; o global tem de rodar junto.
const husky = path.join(home, 'husky');
fs.mkdirSync(path.join(husky, '.husky'), { recursive: true });
run('git', ['init', '-q'], husky);
fs.writeFileSync(path.join(husky, '.husky', 'commit-msg'), '#!/bin/sh\necho local >> "$1.rodou"\n', { mode: 0o755 });
run('git', ['config', 'core.hooksPath', '.husky'], husky);
conferir(commitar(husky, 'husky'), 'repo com husky');
assert.ok(fs.existsSync(path.join(husky, '.git', 'COMMIT_EDITMSG.rodou')), 'hook local nao rodou');

fs.rmSync(home, { recursive: true, force: true });
console.log('sem-coautoria-ia: instalacao idempotente, credito de IA removido, coautor humano mantido.');
