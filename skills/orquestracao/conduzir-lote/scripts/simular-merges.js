#!/usr/bin/env node
// Simula, sem tocar no working tree nem criar branch, os merges de varias refs sobre uma base, na
// ordem dada, e diz qual conflita e em que arquivos. Cada merge se aplica sobre o resultado do
// anterior, como os merges de verdade vao se aplicar.
//
// Para no primeiro conflito: a arvore de um merge conflitante traz os marcadores de conflito, e o
// que vem depois depende de como ele for resolvido. As refs seguintes saem como nao simuladas.
//
// Uso (dentro do clone): node simular-merges.js <base> <ref1> <ref2> ...
// Exemplo: node simular-merges.js origin/homol origin/mr-a origin/mr-b
// Sai com codigo 1 se algum merge conflita. Pede git 2.38 ou mais novo (merge-tree --write-tree).

const { spawnSync } = require('child_process');

function git(argumentos) {
  const r = spawnSync('git', argumentos, { encoding: 'utf8' });
  if (r.error) throw r.error;
  return r;
}

function revisao(ref) {
  const r = git(['rev-parse', '--verify', ref]);
  if (r.status !== 0) {
    console.error(`Ref nao encontrada: ${ref}. Rodou git fetch?`);
    process.exit(2);
  }
  return r.stdout.trim();
}

const [base, ...refs] = process.argv.slice(2);
if (!base || refs.length === 0) {
  console.error('Uso: node simular-merges.js <base> <ref1> <ref2> ...');
  process.exit(2);
}

let acumulado = revisao(base);
for (const [posicao, ref] of refs.entries()) {
  const commit = revisao(ref);
  const r = git(['merge-tree', '--write-tree', '--name-only', acumulado, commit]);
  if (r.status !== 0 && r.status !== 1) {
    console.error(`merge-tree falhou em ${ref}: ${r.stderr.trim()}`);
    process.exit(2);
  }
  // Saida: a arvore na primeira linha; com conflito, os arquivos ate a primeira linha vazia.
  const linhas = r.stdout.split('\n');
  if (r.status === 1) {
    const arquivos = [];
    for (const linha of linhas.slice(1)) {
      if (!linha.trim()) break;
      arquivos.push(linha.trim());
    }
    console.log(`${ref}: CONFLITO em ${arquivos.join(', ')}`);
    for (const seguinte of refs.slice(posicao + 1)) {
      console.log(`${seguinte}: nao simulada, depende de como ${ref} for resolvida`);
    }
    process.exit(1);
  }
  console.log(`${ref}: limpo`);
  // O proximo merge parte deste resultado, para a ordem valer como na vida real.
  acumulado = git(['commit-tree', linhas[0].trim(), '-p', acumulado, '-p', commit, '-m', 'simulacao']).stdout.trim();
}
