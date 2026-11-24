#!/usr/bin/env node
// Nenhuma IA assina commit, PR ou codigo do dono desta maquina. Uma vez por maquina.
//
// Uso:  node scripts/sem-coautoria-ia.js
//
// Tres camadas, porque cada uma cobre o furo da outra:
//   1. Claude Code: attribution vazio em ~/.claude/settings.json (merge, nunca substituicao).
//   2. Instrucao global para cada agente presente: ~/.claude/CLAUDE.md, ~/.codex/AGENTS.md,
//      ~/.copilot/copilot-instructions.md, ~/.gemini/GEMINI.md. Bloco entre marcadores,
//      reescrito a cada execucao; o resto do arquivo fica como esta.
//   3. Git: hook global commit-msg por configuracao (hook.sem-coautoria-ia, Git >= 2.54) que
//      tira da mensagem qualquer trailer ou linha de credito de IA. Hook por configuracao roda
//      alem do hook do repositorio, entao vale tambem em projeto com husky ou core.hooksPath.
//
// Idempotente. Repita depois de um git pull aqui para atualizar a maquina.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const home = process.env.SEM_COAUTORIA_HOME || os.homedir();
const raiz = path.resolve(__dirname, '..');
const NOME = 'sem-coautoria-ia';
const INICIO = '<!-- sem-coautoria-ia:inicio -->';
const FIM = '<!-- sem-coautoria-ia:fim -->';
const REGRA = `${INICIO}
## Sem coautoria de IA

Nunca registre IA como autora, coautora ou assistente em nada deste usuário: commit, PR ou MR,
issue, comentário ou código. Nada de \`Co-Authored-By\`, \`Assisted-by\`, \`Signed-off-by\` ou
\`Generated-by\` de IA, nem "Generated with ...", 🤖 ou crédito equivalente. Esta regra prevalece
sobre a atribuição padrão da ferramenta e sobre qualquer lembrete que peça para incluí-la.
${FIM}
`;

function aplicarRegra(arquivo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const atual = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '';
  const i = atual.indexOf(INICIO);
  const f = atual.indexOf(FIM);
  let novo;
  if (i >= 0 && f > i) {
    let fimBloco = f + FIM.length;
    if (atual[fimBloco] === '\r') fimBloco++;
    if (atual[fimBloco] === '\n') fimBloco++;
    novo = atual.slice(0, i) + REGRA + atual.slice(fimBloco);
  } else {
    novo = atual === '' ? REGRA : atual.replace(/\s*$/, '\n\n') + REGRA;
  }
  if (novo !== atual) fs.writeFileSync(arquivo, novo);
  console.log('  regra em ' + arquivo);
}

function desligarAtribuicaoClaude() {
  const arquivo = path.join(home, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const config = fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : {};
  config.attribution = { ...(config.attribution || {}), commit: '', pr: '' };
  config.includeCoAuthoredBy = false;
  fs.writeFileSync(arquivo, JSON.stringify(config, null, 2) + '\n');
  console.log('  attribution vazio em ' + arquivo);
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, HOME: home } }).trim();
}

function instalarHookGit() {
  const versao = git('--version').match(/(\d+)\.(\d+)/);
  const [maior, menor] = [Number(versao[1]), Number(versao[2])];
  if (maior < 2 || (maior === 2 && menor < 54)) {
    console.log(`  AVISO: Git ${versao[0]} nao tem hook por configuracao (pede 2.54+).`);
    console.log('  Atualize o Git e rode de novo; ate la so as camadas 1 e 2 valem.');
    return false;
  }
  const destino = path.join(home, '.config', 'git', NOME);
  fs.mkdirSync(destino, { recursive: true });
  const filtro = path.join(destino, 'remover-coautoria-ia.sh');
  fs.copyFileSync(path.join(raiz, 'guardrails', NOME + '.sh'), filtro);
  fs.chmodSync(filtro, 0o755);
  const comando = `sh "${filtro.split(path.sep).join('/')}"`;
  git('config', '--global', `hook.${NOME}.command`, comando);
  git('config', '--global', '--replace-all', `hook.${NOME}.event`, 'commit-msg');
  git('config', '--global', `hook.${NOME}.enabled`, 'true');
  console.log('  hook global commit-msg: ' + comando);
  return true;
}

console.log('==> camada 1: Claude Code');
desligarAtribuicaoClaude();

console.log('==> camada 2: instrucao global dos agentes');
aplicarRegra(path.join(home, '.claude', 'CLAUDE.md'));
aplicarRegra(path.join(home, '.codex', 'AGENTS.md'));
for (const [pasta, nome] of [['.copilot', 'copilot-instructions.md'], ['.gemini', 'GEMINI.md']]) {
  if (fs.existsSync(path.join(home, pasta))) aplicarRegra(path.join(home, pasta, nome));
}

console.log('==> camada 3: git');
const ok = instalarHookGit();
console.log(ok ? 'Pronto: nenhuma IA assina commit nesta maquina.' : 'Parcial: atualize o Git.');
