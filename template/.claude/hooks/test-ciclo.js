#!/usr/bin/env node
// Bateria do hook ciclo-antes-do-commit.js.
//
// Uso:  node .claude/hooks/test-ciclo.js
//
// Cada caso monta um repositorio git temporario, uma transcricao falsa no formato do Claude Code
// e roda o hook como o harness roda. Metade dos casos e liberacao: um portao que trava commit de
// documentacao, ou o commit depois de um ciclo correto, e desligado na primeira semana.
//
// Sai com codigo 1 se algum caso falhar, para servir de portao em CI.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const HOOK = path.join(__dirname, 'ciclo-antes-do-commit.js');
let id = 0;

const skill = (nome) => ({ type: 'tool_use', id: `t${++id}`, name: 'Skill', input: { skill: nome } });
const edita = (arquivo) => ({ type: 'tool_use', id: `t${++id}`, name: 'Edit', input: { file_path: arquivo } });
const bash = (command) => ({ type: 'tool_use', id: `t${++id}`, name: 'Bash', input: { command } });
const negado = () => ({ type: 'tool_result', tool_use_id: 'x', is_error: true,
  content: '[ciclo-antes-do-commit] Commit com codigo sem o ciclo completo.' });
const digitada = (nome) => `<command-name>/${nome}</command-name>`;

function montar({ arquivos = [], naoIndexados = [], constituicao, ciclo, principal, subagente }) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'ciclo-'));
  const g = (...args) => execFileSync('git', args, { cwd: raiz, stdio: 'ignore' });
  g('init', '-q');
  for (const arquivo of arquivos) {
    fs.mkdirSync(path.dirname(path.join(raiz, arquivo)), { recursive: true });
    fs.writeFileSync(path.join(raiz, arquivo), 'x\n');
  }
  if (constituicao) fs.writeFileSync(path.join(raiz, 'CONSTITUTION.md'), '# C\n');
  if (ciclo) {
    fs.mkdirSync(path.join(raiz, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(raiz, '.claude', 'ciclo.json'), JSON.stringify(ciclo));
  }
  if (arquivos.length) g('add', ...arquivos);
  // Caminho commitado e depois alterado sem indexar: so entra no commit se o comando o nomear.
  if (naoIndexados.length) {
    for (const arquivo of naoIndexados) {
      fs.mkdirSync(path.dirname(path.join(raiz, arquivo)), { recursive: true });
      fs.writeFileSync(path.join(raiz, arquivo), 'x\n');
    }
    g('add', ...naoIndexados);
    g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'base');
    for (const arquivo of naoIndexados) fs.writeFileSync(path.join(raiz, arquivo), 'y\n');
  }

  const registro = (partes) => partes.map((p) => JSON.stringify(typeof p === 'string'
    ? { type: 'user', message: { role: 'user', content: p } }
    : { type: 'assistant', message: { role: 'assistant', content: [p] } })).join('\n') + '\n';
  const transcricao = path.join(raiz, '..', `${path.basename(raiz)}.jsonl`);
  fs.writeFileSync(transcricao, registro(principal(raiz)));
  if (subagente) {
    const pasta = path.join(transcricao.replace(/\.jsonl$/, ''), 'subagents');
    fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(path.join(pasta, 'agent-1.jsonl'), registro(subagente(raiz)));
  }
  return { raiz, transcricao };
}

function rodar(montagem, comando, semTranscricao) {
  const entrada = JSON.stringify({
    tool_name: 'Bash',
    tool_input: { command: comando },
    cwd: montagem.raiz,
    transcript_path: semTranscricao ? undefined : montagem.transcricao,
  });
  const saida = execFileSync(process.execPath, [HOOK], { input: entrada, encoding: 'utf8' });
  return saida.trim() ? 'BLOQUEIA' : 'LIBERA';
}

const src = (r) => path.join(r, 'src', 'app.py');
const teste = (r) => path.join(r, 'tests', 'test_app.py');
const CODIGO = ['src/app.py', 'tests/test_app.py'];

const casos = [
  ['LIBERA', 'comando que nao e commit', { arquivos: CODIGO, principal: (r) => [edita(src(r))] }, 'git status'],
  ['LIBERA', 'commit so de documentacao', { arquivos: ['README.md', 'docs/x.py'], principal: () => [] }],
  ['BLOQUEIA', 'codigo sem tdd', { arquivos: CODIGO, principal: (r) => [edita(teste(r)), edita(src(r))] }],
  ['LIBERA', 'tdd antes do codigo', {
    arquivos: CODIGO, principal: (r) => [skill('mattpocock-skills:tdd'), edita(teste(r)), edita(src(r))] }],
  ['LIBERA', 'tdd digitada pelo usuario', {
    arquivos: CODIGO, principal: (r) => [digitada('mattpocock-skills:tdd'), edita(teste(r)), edita(src(r))] }],
  ['LIBERA', 'teste editado antes da tdd nao conta', {
    arquivos: CODIGO, principal: (r) => [edita(teste(r)), skill('tdd'), edita(src(r))] }],
  ['BLOQUEIA', 'codigo antes da tdd', {
    arquivos: CODIGO, principal: (r) => [edita(src(r)), skill('mattpocock-skills:tdd'), edita(teste(r))] }],
  ['BLOQUEIA', 'codigo antes da tdd, negado, tdd de novo sem reescrever', {
    arquivos: CODIGO,
    principal: (r) => [edita(src(r)), skill('tdd'), bash('git commit -m x'), negado(), skill('tdd')] }],
  ['LIBERA', 'codigo antes da tdd, negado, tdd de novo e codigo reescrito', {
    arquivos: CODIGO,
    principal: (r) => [edita(src(r)), skill('tdd'), bash('git commit -m x'), negado(), skill('tdd'),
      edita(teste(r)), edita(src(r))] }],
  ['BLOQUEIA', 'codigo reescrito antes da tdd pos-negacao', {
    arquivos: CODIGO,
    principal: (r) => [edita(src(r)), skill('tdd'), bash('git commit -m x'), negado(), edita(src(r)),
      skill('tdd')] }],
  ['BLOQUEIA', 'codigo antes da tdd, negado, sem tdd de novo', {
    arquivos: CODIGO,
    principal: (r) => [edita(src(r)), skill('tdd'), bash('git commit -m x'), negado(), edita(teste(r))] }],
  ['LIBERA', 'commit anterior zera o escopo da ordem', {
    arquivos: CODIGO,
    principal: (r) => [edita(src(r)), bash('git commit -m velho'), skill('tdd'), edita(teste(r)), edita(src(r))] }],
  ['LIBERA', 'tdd chamada pela subagente', {
    arquivos: CODIGO, principal: () => [], subagente: (r) => [skill('mattpocock-skills:tdd'), edita(src(r))] }],
  ['BLOQUEIA', 'codigo antes da tdd na subagente', {
    arquivos: CODIGO, principal: () => [], subagente: (r) => [edita(src(r)), skill('tdd')] }],
  ['BLOQUEIA', 'constituicao sem conformidade', {
    arquivos: CODIGO, constituicao: true, principal: (r) => [skill('tdd'), edita(src(r))] }],
  ['LIBERA', 'constituicao com conformidade', {
    arquivos: CODIGO, constituicao: true,
    principal: (r) => [skill('tdd'), edita(src(r)), skill('israel-skills:conformidade-constitucional')] }],
  ['LIBERA', 'caminho ignorado pelo dono', {
    arquivos: ['infra/deploy.yml'], ciclo: { ignorar: ['^infra/'] }, principal: () => [] }],
  ['BLOQUEIA', 'git -C caminho commit', { arquivos: CODIGO, principal: () => [] }, 'git -C . commit -m x'],
  ['BLOQUEIA', 'PowerShell git.exe commit', { arquivos: CODIGO, principal: () => [] }, 'git.exe commit -m x'],
  ['BLOQUEIA', 'commit com caminho nao indexado', {
    naoIndexados: ['src/app.py'], principal: () => [] }, 'git commit src/app.py -m x'],
  ['BLOQUEIA', 'commit com -- caminho nao indexado', {
    naoIndexados: ['src/app.py'], principal: () => [] }, 'git commit -m "x" -- src/app.py'],
  ['LIBERA', 'commit de caminho de doc nao indexado', {
    naoIndexados: ['README.md', 'src/app.py'], principal: () => [] }, 'git commit -m x README.md'],
  ['LIBERA', 'caminho citado na mensagem nao conta', {
    naoIndexados: ['src/app.py'], principal: () => [] }, 'git commit -m "corrige src/app.py"'],
  ['BLOQUEIA', 'commit -am leva o nao indexado', {
    naoIndexados: ['src/app.py'], principal: () => [] }, 'git commit -am "x"'],
  ['LIBERA', 'sem transcricao, nao julga', { arquivos: CODIGO, principal: () => [] }, 'git commit -m x', true],
];

let falhas = 0;
for (const [esperado, rotulo, montagem, comando = 'git commit -m "feat: x"', semTranscricao] of casos) {
  const real = rodar(montar(montagem), comando, semTranscricao);
  if (real === esperado) console.log('  ok      ' + real.padEnd(8) + ' ' + rotulo);
  else {
    console.log('  FALHA   esperado=' + esperado + ' obtido=' + real + '  ' + rotulo);
    falhas++;
  }
}
console.log('');
console.log('casos: ' + casos.length + '   falhas: ' + falhas);
process.exit(falhas === 0 ? 0 : 1);
