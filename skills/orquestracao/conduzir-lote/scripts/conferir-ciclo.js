#!/usr/bin/env node
// Lista o que uma frente de fato chamou: as skills (com os argumentos) e os subagentes (com o
// modelo), lidos dos registros que o Claude Code grava em ~/.claude/projects/<pasta>/*.jsonl.
// O relatorio da frente diz o que ela acha que fez; o registro diz o que ela fez.
//
// Uso: node conferir-ciclo.js <pasta do worktree> [--branch <branch>] [--exigir skill1,skill2]
// Com --exigir, sai com codigo 1 e o nome de cada skill exigida que nao foi chamada.
// Sem dependencia externa; roda no node do ambiente.

const fs = require('fs');
const os = require('os');
const path = require('path');

function lerArgumentos(argv) {
  const opcoes = { pasta: null, branch: null, exigir: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--branch') opcoes.branch = argv[++i];
    else if (argv[i] === '--exigir') opcoes.exigir = argv[++i].split(',').filter(Boolean);
    else opcoes.pasta = argv[i];
  }
  return opcoes;
}

// O Claude Code nomeia a pasta do projeto trocando todo caractere fora de [A-Za-z0-9] por '-'.
function pastaDosRegistros(pastaDoWorktree) {
  const nome = path.resolve(pastaDoWorktree).replace(/[^A-Za-z0-9]/g, '-');
  return path.join(os.homedir(), '.claude', 'projects', nome);
}

function arquivosJsonl(pasta) {
  const achados = [];
  for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
    const caminho = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) achados.push(...arquivosJsonl(caminho));
    else if (entrada.name.endsWith('.jsonl')) achados.push(caminho);
  }
  return achados;
}

function resumir(texto, limite) {
  const linha = String(texto ?? '').replace(/\s+/g, ' ').trim();
  return linha.length > limite ? `${linha.slice(0, limite)}...` : linha;
}

function conferir({ pasta, branch, exigir }) {
  const registros = pastaDosRegistros(pasta);
  if (!fs.existsSync(registros)) {
    console.error(`Sem registros em ${registros}. A pasta do worktree esta certa (caminho do Windows)?`);
    process.exit(2);
  }
  const vistos = new Set();
  const skills = [];
  const subagentes = [];
  const branchesVistas = new Set();
  for (const arquivo of arquivosJsonl(registros)) {
    for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
      if (!linha.trim()) continue;
      let entrada;
      try {
        entrada = JSON.parse(linha);
      } catch {
        continue;
      }
      if (entrada.gitBranch) branchesVistas.add(entrada.gitBranch);
      if (branch && entrada.gitBranch !== branch) continue;
      const conteudo = entrada.message?.content;
      if (!Array.isArray(conteudo)) continue;
      for (const parte of conteudo) {
        if (parte.type !== 'tool_use' || vistos.has(parte.id)) continue;
        vistos.add(parte.id);
        if (parte.name === 'Skill') {
          skills.push({ skill: parte.input?.skill, args: parte.input?.args, sessao: path.basename(arquivo) });
        } else if (parte.name === 'Agent' || parte.name === 'Task') {
          subagentes.push({
            descricao: parte.input?.description,
            modelo: parte.input?.model || 'herdado',
            sessao: path.basename(arquivo),
          });
        }
      }
    }
  }

  console.log(`Registros: ${registros}${branch ? ` (branch ${branch})` : ''}`);
  console.log(`\nSkills chamadas (${skills.length}):`);
  for (const s of skills) console.log(`  ${s.skill}  ${resumir(s.args, 120)}  [${s.sessao}]`);
  console.log(`\nSubagentes (${subagentes.length}):`);
  for (const a of subagentes) console.log(`  ${resumir(a.descricao, 80)} (${a.modelo})  [${a.sessao}]`);

  // O filtro casa com a branch local do worktree, que pode ter outro nome que a branch do MR.
  if (branch && !branchesVistas.has(branch)) {
    console.log(`\nNenhum registro na branch ${branch}. Branches nos registros: ${[...branchesVistas].join(', ')}`);
    process.exit(2);
  }

  const chamadas = new Set(skills.map((s) => s.skill));
  const faltam = exigir.filter((nome) => !chamadas.has(nome));
  if (faltam.length) {
    console.log(`\nFaltam skills exigidas: ${faltam.join(', ')}`);
    process.exit(1);
  }
  if (exigir.length) console.log('\nTodas as skills exigidas foram chamadas.');
}

const opcoes = lerArgumentos(process.argv.slice(2));
if (!opcoes.pasta) {
  console.error('Uso: node conferir-ciclo.js <pasta do worktree> [--branch <branch>] [--exigir skill1,skill2]');
  process.exit(2);
}
conferir(opcoes);
