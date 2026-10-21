#!/usr/bin/env node
// Contrato PreToolUse compartilhado. So payloads sinteticos; nao executa comandos.
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const hook = process.argv[2] || path.join(__dirname, 'block-secrets.js');
let casos = 0;
function testar(input, bloqueia, rotulo) {
  const resultado = spawnSync(process.execPath, [hook], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', timeout: 5000,
  });
  assert.equal(resultado.status, 0, rotulo + ': ' + resultado.stderr);
  const saida = resultado.stdout.trim();
  if (bloqueia) {
    const resposta = JSON.parse(saida);
    assert.equal(resposta.hookSpecificOutput.hookEventName, 'PreToolUse', rotulo);
    assert.equal(resposta.hookSpecificOutput.permissionDecision, 'deny', rotulo);
    assert.ok(!saida.includes('MARCADOR_SENSIVEL'), 'nao ecoar entrada');
  } else assert.equal(saida, '', rotulo);
  casos++;
}
const chamada = (tool_name, tool_input) => ({ hook_event_name: 'PreToolUse', tool_name, tool_input });
for (const arquivo of ['.env', '.env.production', '.envrc', '.npmrc', '.netrc', '.pgpass',
  'credentials', 'secrets.json', 'secrets.yaml', 'service-account-teste.json', 'chave.key',
  'chave.pem', 'id_ed25519', 'id_rsa', 'cert.p12', 'cert.pfx', 'cert.jks', '.env.private.sample',
  'C:\\projeto\\.ENV', 'C:\\projeto\\.env:stream', '.env. ', '../.env']) {
  testar(chamada('Read', { file_path: arquivo }), true, arquivo);
}
for (const arquivo of ['.env.example', '.env.exemplo', '.env.sample', '.env.template', '.env.dist',
  'src/environment.ts', 'README.md']) {
  testar(chamada('Read', { file_path: arquivo }), false, arquivo);
}
for (const comando of ['cat .env', 'Get-Content C:\\projeto\\.env',
  'C:\\Python\\python.exe -c "open(\'.env\').read()"',
  '[IO.File]::ReadAllText(".env")', 'node -e "fs.readFileSync(\'.env\')"',
  'git show HEAD:.env', 'git show HEAD:config/.env', 'source .env', '. .env',
  'cat ../cert.key', 'Select-String -Path .env -Pattern teste', 'cat secrets.json',
  'cd projeto\nGet-Content .env', 'cat .env MARCADOR_SENSIVEL']) {
  testar(chamada('Bash', { command: comando }), true, comando);
}
for (const comando of ['echo .env >> .gitignore', 'git status', 'git check-ignore .env',
  'ls -la .env', 'find . -name .env', 'cat .env.example', 'Get-Content README.md']) {
  testar(chamada('Bash', { command: comando }), false, comando);
}
testar(chamada('exec_command', { cmd: 'Get-Content .env' }), true, 'cmd');
testar(chamada('python', { code: 'open(".env").read()' }), true, 'codigo Python com open');
testar(chamada('node', { code: 'fs.readFileSync(".env")' }), true, 'code');
testar(chamada('mcp__fs__read_many', { paths: ['README.md', '.env'] }), true, 'paths');
testar(chamada('mcp__fs__read', { request: { path: '.env' } }), true, 'nested');
for (const operacao of ['Add File', 'Update File', 'Delete File', 'Move to']) {
  testar(chamada('apply_patch', { command: '*** Begin Patch\n*** ' + operacao + ': .env\n*** End Patch' }), true, operacao);
}
testar(chamada('apply_patch', { command: '*** Begin Patch\n*** Update File: README.md\n+Nao leia .env\n*** End Patch' }), false, 'doc patch');
testar(chamada('apply_patch', { command: '*** Begin Patch\n*** Add File: .env.example\n+FAKE=example\n*** End Patch' }), false, 'example patch');
for (const valor of ['not-json', 'null', '{}', '{"tool_input":null}', '{"tool_input":[]}']) {
  testar(valor, true, 'entrada invalida');
}
console.log('Hooks: ' + casos + ' casos passaram (payloads ficticios; nenhum comando executado).');
