#!/usr/bin/env node
// Instala os hooks do Codex sem alterar os do Claude. Migracao de 2026-10-20.
// Merge idempotente, backup de arquivo alterado e nenhuma leitura de .env.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const template = path.resolve(__dirname, '../template/.codex/hooks');
const SOURCE = fs.existsSync(template) ? template : path.resolve(__dirname, '../.codex/hooks');
const STATUS = 'Israel skills: conferindo acesso a segredos';
const NODE_RESERVA = fs.realpathSync(process.execPath);
const citarPosix = valor => "'" + valor.replace(/'/g, "'\\''") + "'";
const citarPowerShell = valor => "'" + valor.replace(/'/g, "''") + "'";

function comandosDoHook(script) {
  const falha = 'Hook de segredos nao rodou; chamada bloqueada.';
  return {
    command: 'N=$(command -v node) || N=' + citarPosix(NODE_RESERVA.replace(/\\/g, '/')) +
      '; "$N" ' + citarPosix(script.replace(/\\/g, '/')) +
      ' || { echo "' + falha + '" >&2; exit 2; }',
    commandWindows: 'try { $n = Get-Command node -CommandType Application -ErrorAction SilentlyContinue; ' +
      'if ($n) { & $n.Source ' + citarPowerShell(script) + ' } else { & ' +
      citarPowerShell(NODE_RESERVA) + ' ' + citarPowerShell(script) +
      ' }; if ($LASTEXITCODE -ne 0) { exit 2 } } catch { [Console]::Error.WriteLine(' +
      citarPowerShell(falha) + '); exit 2 }',
  };
}

function semLinks(caminho) {
  for (let atual = path.resolve(caminho); ; atual = path.dirname(atual)) {
    if (fs.existsSync(atual) && fs.lstatSync(atual).isSymbolicLink()) {
      throw new Error('Destino com link simbolico: ' + atual);
    }
    if (path.dirname(atual) === atual) break;
  }
}

function gravarComBackup(arquivo, conteudo) {
  semLinks(arquivo);
  if (fs.existsSync(arquivo)) {
    const anterior = fs.readFileSync(arquivo);
    if (anterior.equals(Buffer.from(conteudo))) return false;
    const backup = arquivo + '.backup-' + Date.now() + '-' + process.pid;
    fs.writeFileSync(backup, anterior, { flag: 'wx', mode: 0o600 });
  }
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const temporario = arquivo + '.tmp-' + process.pid;
  fs.writeFileSync(temporario, conteudo, { flag: 'wx', mode: 0o600 });
  fs.renameSync(temporario, arquivo);
  return true;
}

function instalar(diretorioCodex) {
  const destino = path.resolve(diretorioCodex);
  // Os comandos gerados devem ser literais tambem no PowerShell/cmd.
  if (/["$`%\r\n]/.test(destino)) throw new Error('Caminho contem caracteres nao suportados no comando do hook.');
  semLinks(destino);
  const arquivo = path.join(destino, 'hooks.json');
  semLinks(arquivo);
  const config = fs.existsSync(arquivo)
    ? JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, '')) : {};
  if (!config || Array.isArray(config) || typeof config !== 'object') throw new Error('hooks.json invalido');
  if (config.hooks === undefined) config.hooks = {};
  if (!config.hooks || Array.isArray(config.hooks) || typeof config.hooks !== 'object') throw new Error('hooks invalido');
  if (config.hooks.PreToolUse === undefined) config.hooks.PreToolUse = [];
  if (!Array.isArray(config.hooks.PreToolUse)) throw new Error('PreToolUse deve ser lista');
  const script = path.join(destino, 'hooks', 'israel-skills', 'block-secrets.js');
  const grupo = {
    matcher: '.*',
    hooks: [{
      type: 'command',
      ...comandosDoHook(script),
      timeout: 30,
      statusMessage: STATUS,
    }],
  };
  // So substitui o grupo inteiramente pertencente a este instalador.
  // Grupos de terceiros, inclusive outros hooks PreToolUse, ficam intactos.
  const grupos = config.hooks.PreToolUse;
  const indice = grupos.findIndex(g => g && Array.isArray(g.hooks) && g.hooks.length === 1 &&
    g.hooks[0].statusMessage === STATUS && /[\\/]israel-skills[\\/]block-secrets\.js/.test(g.hooks[0].command || ''));
  if (indice < 0) grupos.push(grupo); else grupos[indice] = grupo;
  const arquivos = ['block-secrets.js', 'test.js'];
  const fontes = arquivos.map(nome => fs.readFileSync(path.join(SOURCE, nome)));
  arquivos.forEach((nome, i) => gravarComBackup(path.join(path.dirname(script), nome), fontes[i]));
  gravarComBackup(arquivo, JSON.stringify(config, null, 2) + '\n');
  return { arquivo, script };
}

function main(args) {
  let destino;
  if (args.length === 1 && args[0] === '--user') {
    destino = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  } else if (args.length === 2 && args[0] === '--project') {
    const projeto = path.resolve(args[1]);
    if (!fs.statSync(projeto).isDirectory()) throw new Error('Projeto deve ser diretorio existente');
    destino = path.join(projeto, '.codex');
  } else {
    throw new Error('Uso: node scripts/install-codex-hooks.js --user | --project <diretorio>');
  }
  // Testa apenas payloads sinteticos. Nao executa comandos recebidos pelo hook.
  execFileSync(process.execPath, [path.join(SOURCE, 'test.js')], { stdio: 'inherit' });
  const resultado = instalar(destino);
  console.log('Configurado: ' + resultado.arquivo);
  console.log('Script: ' + resultado.script);
  console.log('Ainda requer revisao de confianca: abra uma nova sessao Codex e /hooks.');
  console.log('Nao altera config.toml, confianca, sandbox nem permissoes do Claude.');
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (erro) { console.error('Instalacao interrompida: ' + erro.message); process.exitCode = 1; }
}
module.exports = { instalar };
