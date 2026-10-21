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
assert.match(config.hooks.PreToolUse[1].hooks[0].commandWindows, /Get-Command node/);
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

// Mesmo sem fnm/nvm no PATH, o comando usa o Node real da instalacao.
const { spawnSync } = require('node:child_process');
const handler = config.hooks.PreToolUse[1].hooks[0];
const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'cat .env' } });
const terminal = process.platform === 'win32'
  ? path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe') : '/bin/sh';
const rodar = comando => spawnSync(terminal,
  process.platform === 'win32' ? ['-NoProfile', '-Command', comando] : ['-c', comando],
  { input: payload, encoding: 'utf8', env: { ...process.env, PATH: '' }, timeout: 30000 });
const comando = process.platform === 'win32' ? handler.commandWindows : handler.command;
const semPath = rodar(comando);
assert.equal(semPath.status, 0, semPath.error?.message || semPath.stderr);
assert.equal(JSON.parse(semPath.stdout).hookSpecificOutput.permissionDecision, 'deny');
const scriptInstalado = path.join(pasta, 'hooks/israel-skills/block-secrets.js');
const comandoQuebrado = comando.split(scriptInstalado).join(scriptInstalado + '.ausente')
  .split(scriptInstalado.replace(/\\/g, '/')).join(scriptInstalado.replace(/\\/g, '/') + '.ausente');
const ausente = rodar(comandoQuebrado);
assert.equal(ausente.status, 2, 'hook ausente deve bloquear com exit 2');
console.log('Node fora do PATH: reserva funciona; hook ausente retorna bloqueio.');

// Regressao Windows: varios Nodes no PATH e ambiente sem PATHEXT.
if (process.platform === 'win32') {
  const executar = (cmd, input, env) => spawnSync(terminal,
    ['-NoProfile', '-NonInteractive', '-Command', cmd],
    { input, encoding: 'utf8', env, timeout: 30000 });
  const verificar = (resultado, negado, rotulo) => {
    assert.equal(resultado.status, 0, rotulo + ': ' + (resultado.error?.message || resultado.stderr));
    assert.equal(resultado.stderr, '', rotulo);
    if (negado) assert.equal(JSON.parse(resultado.stdout).hookSpecificOutput.permissionDecision, 'deny', rotulo);
    else assert.equal(resultado.stdout, '', rotulo);
  };
  const dirs = ['node-a', 'node-b'].map(nome => path.join(raiz, nome));
  for (const dir of dirs) {
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'node.cmd'), '@echo off\r\n"' + process.execPath + '" %*\r\nexit /b %errorlevel%\r\n');
  }
  const varios = { ...process.env, PATH: dirs.join(path.delimiter), PATHEXT: '.COM;.EXE;.BAT;.CMD' };
  const encontrados = executar('(Get-Command node -CommandType Application).Count', '', varios);
  assert.equal(encontrados.status, 0, encontrados.stderr);
  assert.equal(Number(encontrados.stdout.trim()), 2, 'fixture deve encontrar dois Nodes');
  const permitido = JSON.stringify({ tool_input: { cmd: 'git status' } });
  verificar(executar(comando, permitido, varios), false, 'varios Nodes: permitir');
  verificar(executar(comando, payload, varios), true, 'varios Nodes: negar');
  verificar(executar(comando, 'json-invalido', varios), true, 'varios Nodes: JSON invalido');
  for (const extensoes of [undefined, '']) {
    const semExtensoes = { SystemRoot: process.env.SystemRoot, PATH: '' };
    if (extensoes !== undefined) semExtensoes.PATHEXT = extensoes;
    const bloqueado = executar(comando, permitido, semExtensoes);
    assert.equal(bloqueado.status, 2, 'sem PATHEXT deve bloquear com diagnostico');
    assert.match(bloqueado.stderr, /Node nao retornou codigo de saida/);
  }
  const minimo = { SystemRoot: process.env.SystemRoot, PATH: '', PATHEXT: '.COM;.EXE;.BAT;.CMD' };
  verificar(executar(comando, permitido, minimo), false, 'ambiente minimo: permitir');
  verificar(executar(comando, payload, minimo), true, 'ambiente minimo: negar');
  const reserva = fs.realpathSync(process.execPath).replace(/'/g, "''");
  const nodeAusente = comando.split("'" + reserva + "'").join("'" + reserva + ".ausente'");
  const falha = executar(nodeAusente, permitido, minimo);
  assert.equal(falha.status, 2, 'Node ausente deve bloquear');
  assert.match(falha.stderr, /CommandNotFoundException/, 'diagnostico deve preservar a causa');
  const semExecucao = comando.replace(/& \$n\.Source '[^']*'/, '$null')
    .replace('& ' + "'" + reserva + "' '" + scriptInstalado.replace(/'/g, "''") + "'", '$null');
  assert.notEqual(semExecucao, comando);
  const semCodigo = executar(semExecucao, permitido, minimo);
  assert.equal(semCodigo.status, 2, 'ausencia de codigo nao pode liberar');
  assert.match(semCodigo.stderr, /Node nao retornou codigo de saida/);
  const scriptAusente = executar(comandoQuebrado, permitido, minimo);
  assert.equal(scriptAusente.status, 2);
  assert.match(scriptAusente.stderr, /Node terminou com codigo 1/);
  console.log('Windows: varios Nodes, PATHEXT ausente, JSON invalido e falhas diagnosticadas passaram.');
}
