#!/usr/bin/env node
// Barra o `git commit` de codigo quando a sessao nao rodou o ciclo: a skill `tdd` antes do codigo,
// e a `conformidade-constitucional` quando o repositorio tem CONSTITUTION.md.
//
// Hook PreToolUse (Bash|PowerShell) do Claude Code. Le a transcricao da sessao, e das subagentes
// dela, pelo transcript_path que o harness entrega. Instrucao em prompt o agente esquece; este
// hook nao deixa o commit sair sem o ciclo.
//
// Tres conferencias, so quando o commit leva codigo (arquivo fora de docs e da lista `ignorar`):
//   1. `tdd` foi chamada em algum ponto da sessao.
//   2. Desde o ultimo commit, a primeira edicao de codigo (Edit/Write fora de teste) veio depois
//      da primeira chamada da `tdd`. Codigo antes do teste e o defeito que este hook existe para
//      pegar. Depois de uma negacao, chamar a `tdd` de novo e refazer a fatia libera.
//   3. `conformidade-constitucional` foi chamada, se ha CONSTITUTION.md na raiz.
//
// Sem transcricao legivel, sem git ou com entrada estranha, libera: o hook nao julga o que nao ve.
// Edicao feita por Bash (sed, heredoc) escapa da conferencia 2; a 1 e a 3 continuam valendo.
//
// Configuracao opcional, do dono do projeto, em .claude/ciclo.json:
//   { "ignorar": ["^infra/", "\\.ya?ml$"] }   regex de caminhos que nao contam como codigo

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const MARCA = '[ciclo-antes-do-commit]';
const COMMIT = /\bgit(?:\.exe)?\s+(?:-C\s+\S+\s+|-c\s+\S+\s+)*commit\b/i;
const DOC = /(?:^|\/)(?:docs?)\/|\.(?:md|mdx|txt|rst|adoc)$|(?:^|\/)(?:LICENSE|\.gitignore|\.gitattributes)$/i;
const TESTE = /(?:^|\/)(?:tests?|testes?|__tests__|specs?)\/|(?:^|\/)(?:test_[^/]*|conftest\.py)$|[._-](?:test|spec|teste)\.[^/]+$/i;
const EDICAO = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

function liberar() {
  process.exit(0);
}

function negar(motivo) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `${MARCA} ${motivo}`,
  } }));
  process.exit(0);
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function linhas(texto) {
  return texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function lerIgnorar(raiz) {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(raiz, '.claude', 'ciclo.json'), 'utf8'));
    return (config.ignorar || []).map((r) => new RegExp(r, 'i'));
  } catch {
    return [];
  }
}

// Caminho canonico: no Windows o git devolve o nome longo e a transcricao pode trazer o curto
// (TR8500~1), ou outra caixa. Arquivo que nao existe mais fica com o caminho resolvido.
function canonico(caminho) {
  let real;
  try {
    real = fs.realpathSync.native(caminho);
  } catch {
    real = path.resolve(caminho);
  }
  return process.platform === 'win32' ? real.toLowerCase() : real;
}

// Caminho relativo a raiz, com barra normal; null se fora do repositorio.
function relativo(raiz, arquivo) {
  const rel = path.relative(canonico(raiz), canonico(path.resolve(raiz, arquivo))).replace(/\\/g, '/');
  return rel.startsWith('..') || path.isAbsolute(rel) ? null : rel;
}

function ehCodigo(rel, ignorar) {
  return rel !== null && !DOC.test(rel) && !ignorar.some((r) => r.test(rel));
}

// Nome da skill sem o prefixo do plugin: "mattpocock-skills:tdd" -> "tdd".
function nomeDaSkill(nome) {
  return String(nome || '').replace(/^\//, '').split(':').pop();
}

function textoDe(conteudo) {
  if (typeof conteudo === 'string') return conteudo;
  if (!Array.isArray(conteudo)) return '';
  return conteudo.map((p) => (typeof p === 'string' ? p : p.text || textoDe(p.content))).join('\n');
}

// Eventos de uma transcricao, na ordem: skill chamada (pela ferramenta ou digitada pelo usuario),
// edicao de arquivo, commit, e negacao deste hook.
function eventos(arquivo) {
  const lista = [];
  for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
    if (!linha.trim()) continue;
    let entrada;
    try {
      entrada = JSON.parse(linha);
    } catch {
      continue;
    }
    const conteudo = entrada.message?.content;
    for (const m of textoDe(typeof conteudo === 'string' ? conteudo : []).matchAll(/<command-name>([^<]+)<\/command-name>/g)) {
      lista.push({ tipo: 'skill', nome: nomeDaSkill(m[1]) });
    }
    if (!Array.isArray(conteudo)) continue;
    for (const parte of conteudo) {
      if (parte.type === 'text') {
        for (const m of String(parte.text).matchAll(/<command-name>([^<]+)<\/command-name>/g)) {
          lista.push({ tipo: 'skill', nome: nomeDaSkill(m[1]) });
        }
      } else if (parte.type === 'tool_use' && parte.name === 'Skill') {
        lista.push({ tipo: 'skill', nome: nomeDaSkill(parte.input?.skill) });
      } else if (parte.type === 'tool_use' && EDICAO.has(parte.name)) {
        lista.push({ tipo: 'edicao', arquivo: parte.input?.file_path || parte.input?.notebook_path });
      } else if (parte.type === 'tool_use' && COMMIT.test(String(parte.input?.command || ''))) {
        lista.push({ tipo: 'commit' });
      } else if (parte.type === 'tool_result' && textoDe(parte.content).includes(MARCA)) {
        // O commit negado nao aconteceu: deixa de marcar o inicio do escopo.
        const commit = lista.map((e) => e.tipo).lastIndexOf('commit');
        if (commit !== -1) lista[commit].tipo = 'commit-negado';
        lista.push({ tipo: 'negacao' });
      }
    }
  }
  return lista;
}

function transcricoes(principal) {
  const todas = [principal];
  const subagentes = path.join(principal.replace(/\.jsonl$/, ''), 'subagents');
  if (fs.existsSync(subagentes)) {
    for (const nome of fs.readdirSync(subagentes)) {
      if (nome.endsWith('.jsonl')) todas.push(path.join(subagentes, nome));
    }
  }
  return todas;
}

// Conferencia 2 numa transcricao. O commit em curso ainda nao esta no registro, entao o ultimo
// commit que aparece e o anterior: o escopo e o que veio depois dele.
function codigoAntesDoTeste(lista, raiz, ignorar) {
  const inicio = lista.map((e) => e.tipo).lastIndexOf('commit') + 1;
  const escopo = lista.slice(inicio);
  const primeiraTdd = escopo.findIndex((e) => e.tipo === 'skill' && e.nome === 'tdd');
  const primeiroCodigo = escopo.findIndex((e) => {
    if (e.tipo !== 'edicao' || !e.arquivo) return false;
    const rel = relativo(raiz, e.arquivo);
    return ehCodigo(rel, ignorar) && !TESTE.test(rel);
  });
  if (primeiroCodigo === -1 || primeiraTdd === -1 || primeiraTdd < primeiroCodigo) return false;
  const ultimaNegacao = escopo.map((e) => e.tipo).lastIndexOf('negacao');
  const ultimaTdd = escopo.map((e) => e.tipo === 'skill' && e.nome === 'tdd').lastIndexOf(true);
  return !(ultimaNegacao !== -1 && ultimaTdd > ultimaNegacao);
}

function conferir(entrada) {
  const comando = String(entrada.tool_input?.command || '');
  if (!COMMIT.test(comando)) liberar();
  const transcricao = entrada.transcript_path;
  if (!transcricao || !fs.existsSync(transcricao)) liberar();

  const cwd = entrada.cwd || process.cwd();
  const raiz = linhas(git(cwd, ['rev-parse', '--show-toplevel']))[0];
  const ignorar = lerIgnorar(raiz);
  const mudados = new Set(linhas(git(raiz, ['diff', '--cached', '--name-only'])));
  if (/\s(?:-[a-zA-Z]*a[a-zA-Z]*|--all)\b/.test(comando)) {
    linhas(git(raiz, ['diff', '--name-only'])).forEach((f) => mudados.add(f));
  }
  const codigo = [...mudados].filter((f) => ehCodigo(f, ignorar));
  if (codigo.length === 0) liberar();

  const porArquivo = transcricoes(transcricao).map(eventos);
  const chamadas = new Set(porArquivo.flat().filter((e) => e.tipo === 'skill').map((e) => e.nome));
  const faltas = [];
  if (!chamadas.has('tdd')) {
    faltas.push('A skill `tdd` nao foi chamada nesta sessao. Chame a Skill tool com "mattpocock-skills:tdd" ' +
      'e construa a mudanca em fatias: teste vermelho, depois o codigo ate o verde.');
  } else if (porArquivo.some((lista) => codigoAntesDoTeste(lista, raiz, ignorar))) {
    faltas.push('Codigo de producao foi editado antes da skill `tdd`. Chame a Skill tool com ' +
      '"mattpocock-skills:tdd" de novo e refaca a fatia na ordem: guarde o codigo (git stash), rode o ' +
      'teste novo e mostre o vermelho, devolva o codigo (git stash pop) e mostre o verde.');
  }
  if (fs.existsSync(path.join(raiz, 'CONSTITUTION.md')) && !chamadas.has('conformidade-constitucional')) {
    faltas.push('O projeto tem CONSTITUTION.md e a conferencia nao rodou. Chame a Skill tool com ' +
      '"israel-skills:conformidade-constitucional" sobre o diff antes do commit.');
  }
  if (faltas.length === 0) liberar();

  negar(`Commit com codigo (${codigo.slice(0, 3).join(', ')}${codigo.length > 3 ? ', ...' : ''}) ` +
    `sem o ciclo completo.\n- ${faltas.join('\n- ')}\nDepois, rode o commit de novo. ` +
    'Nao edite .claude/ciclo.json nem o hook para passar: essa decisao e do dono do projeto.');
}

let bruto = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (trecho) => { bruto += trecho; });
process.stdin.on('end', () => {
  try {
    conferir(JSON.parse(bruto));
  } catch {
    liberar();
  }
});
