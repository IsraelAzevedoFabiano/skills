#!/usr/bin/env node
// Bateria do hook block-secrets.js.
//
// Uso:  node .claude/hooks/test.js
//
// Cada linha de casos.txt e:  ESPERADO|rotulo|ferramenta|campo|valor
// ESPERADO e BLOQUEIA ou LIBERA. Rode apos qualquer mudanca no hook: um padrao
// novo costuma trazer falso positivo junto, e falso positivo trava trabalho
// legitimo (editar o proprio .gitignore, por exemplo).
//
// Sai com codigo 1 se algum caso falhar, para servir de portao em CI.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const HOOK = path.join(DIR, 'block-secrets.js');
const CASOS = path.join(DIR, 'casos.txt');

const linhas = fs
  .readFileSync(CASOS, 'utf8')
  .split(/\r?\n/)
  .filter((l) => l.trim());

let falhas = 0;

for (const linha of linhas) {
  const [esperado, rotulo, ferramenta, campo, ...resto] = linha.split('|');
  const valor = resto.join('|');
  const entrada = JSON.stringify({
    tool_name: ferramenta,
    tool_input: { [campo]: valor },
  });

  const saida = execFileSync(process.execPath, [HOOK], {
    input: entrada,
    encoding: 'utf8',
  });

  const real = saida.trim() ? 'BLOQUEIA' : 'LIBERA';
  if (real === esperado) {
    console.log('  ok      ' + real.padEnd(8) + ' ' + rotulo);
  } else {
    console.log(
      '  FALHA   esperado=' + esperado + ' obtido=' + real + '  ' + rotulo
    );
    falhas++;
  }
}

console.log('');
console.log('casos: ' + linhas.length + '   falhas: ' + falhas);
process.exit(falhas === 0 ? 0 : 1);
