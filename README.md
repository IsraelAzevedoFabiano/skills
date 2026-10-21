# Skills e travas compartilhadas

Duas skills próprias, para usar **ao lado** do [`mattpocock-skills`](https://github.com/mattpocock/skills).

O conjunto do Matt dá o fluxo de trabalho: entrevista, spec, tíquetes, implementação, revisão. O que
ele não tem é **constituição** — o documento que prevalece sobre spec, plano e prompt, e que só se
muda emendando. O Spec Kit tem constituição, mas amarra o processo inteiro em volta dela. Este repo
pega só a peça que falta e a encaixa no fluxo do Matt.

| Skill | Invocação | O que faz |
|---|---|---|
| `/constituicao` | só você digita | Escreve ou emenda `CONSTITUTION.md` **a partir da conversa atual**. Sem entrevista. |
| `conformidade-constitucional` | você ou o agente | Confere spec, tíquetes, plano ou diff contra a constituição, princípio por princípio. |

A segunda é a que faz a coisa funcionar. Uma constituição que ninguém confere é um arquivo bonito;
`conformidade-constitucional` é model-invoked, com gatilhos que casam com escrever spec, derivar
tíquetes, planejar e revisar. O agente a alcança sozinho, sem você pedir.

## Instalação

**Uma vez por máquina**, não por projeto. As duas linhas abaixo instalam no escopo `user`.

```bash
# o conjunto do Matt: 25 skills, do marketplace oficial, com auto-update
claude plugin install mattpocock-skills

# a governança: este repo
claude plugin marketplace add IsraelAzevedoFabiano/skills
claude plugin install israel-skills@israel
```

Confira com `claude plugin list`. Reinicie a sessão para as skills carregarem.

Não instale o conjunto do Matt por `npx skills add` ao mesmo tempo que pelo plugin: dá tudo em
duplicidade. Plugin é assinatura, read-only, atualiza quando ele publica. O `skills.sh` copia
arquivos editáveis para dentro do projeto. Escolha um; aqui a escolha é plugin.

## Num projeto novo

Primeiro, um comando no terminal, de dentro deste repo:

```sh
./scripts/init-project.sh /caminho/do/projeto --user
```

Windows: `.\scripts\init-project.ps1 -Destino C:\caminho\do\projeto -User`

Ele copia `template/` para o projeto, declara os dois plugins no `.claude/settings.json` de lá
(que é o `pyproject.toml` da metodologia: quem clonar o projeto recebe os plugins ao abrir a
sessão), instala a blindagem de segredos e roda a bateria que a confere. É idempotente, e `--user`
estende a blindagem a todo repositório da máquina.

Depois, três comandos na sessão, na ordem, uma vez cada:

```
/setup-matt-pocock-skills    → docs/agents/*.md + bloco ## Agent skills no CLAUDE.md
/grill-with-docs             → entrevista + CONTEXT.md (o glossário) + docs/adr/
/constituicao                → CONSTITUTION.md, derivada da conversa que acabou de acontecer
```

A ordem importa. `/constituicao` não entrevista: ela sintetiza. Rodada antes do `/grill-with-docs`
ela não tem material, e vai dizer isso.

Depois, o ciclo de trabalho de sempre:

```
/grill-with-docs → /to-spec → /to-tickets → /implement → /code-review
```

`conformidade-constitucional` entra sozinha ao longo desse ciclo, porque os gatilhos dela casam com
o que essas skills estão fazendo.

## Blindagem de segredos

A politica compartilhada intercepta acessos explicitos a `.env` e credenciais nos hooks
suportados pelo Claude e pelo Codex. O bloqueio depende da instalacao e ativacao no harness.
Os limites e a etapa de confianca do Codex estao descritos abaixo; nao e isolamento do sistema
de arquivos nem garantia de que qualquer agente esteja coberto.

| Peça | O que faz |
|---|---|
| `guardrails/block-secrets.js`, copiado para `template/.claude/hooks/` e `template/.codex/hooks/` | Hook `PreToolUse` que nega Read, Edit, Write, Glob, Grep, Bash e PowerShell quando o alvo é `.env*`, `.pem`, `.key`, `.p12`, `id_rsa`, `.netrc`, `.npmrc`, `.pgpass`, `credentials`, `secrets.*` |
| `template/scripts/aplicar-blindagem.js` | Faz merge do `permissions.deny` e do hook no `settings.json`, e dos padrões no `.gitignore` do repo |
| `template/.claude/hooks/test.js` | `node .claude/hooks/test.js`: 25 casos, metade deles falso positivo |

Arquivo de exemplo (`.env.example`, `.env.exemplo`, `.env.sample`) passa de propósito: não carrega
segredo, e é por ele que o agente descobre quais variáveis existem sem ver valor nenhum.

Três decisões que explicam o desenho:

**Bloqueio, não princípio.** Uma regra escrita em prompt ou em `CONSTITUTION.md` não impede ninguém
de rodar `cat .env`; o hook impede. É o terceiro mecanismo desta lista abaixo aplicado a segredo:
configuração vive em arquivo.

**Só comando que lê dispara.** O hook checa o comando inteiro contra uma lista de leitores (`cat`,
`grep`, `sort`, `python`, `node`, `Get-Content`…). `ls`, `find`, `rm`, `git` e `echo` citam o nome
do arquivo sem abrir o conteúdo, e passam. Sem isso, `echo ".env" >> .gitignore` seria bloqueado.

**Metade da bateria testa falso positivo.** O risco real de um filtro assim não é deixar passar, é
travar trabalho legítimo. O falso positivo que sobra é o comando composto: um leitor numa parte e
`.env` em outra bloqueia tudo. A saída é rodar os comandos separados, nunca desligar o hook.

## Por que isto não se desvia, e um prompt se desvia

Três mecanismos, todos estruturais:

**1. A `description` do frontmatter entra no contexto do sistema.** Skill model-invoked carrega
gatilhos ricos ("use ao escrever uma spec, ao quebrar trabalho em tíquetes…") e o harness injeta
isso em toda sessão. Skill user-invoked leva `disable-model-invocation: true` e só dispara quando
você digita. Nenhum prompt seu consegue imitar isso, porque prompt é mensagem e isso é registro.

**2. Dependência é chamada de ferramenta, não link.** `Call the Skill tool with "grilling"`, nunca
`/grilling` solto na prosa nem `../grilling/SKILL.md`. Nomear a ferramenta tem taxa de acerto muito
maior. Regra dura, herdada do conjunto do Matt: skill user-invoked **nunca** é alcançável por outra
skill; quando um passo depende de uma, a instrução é para o humano rodar.

**3. Configuração vive em arquivo, e a skill falha explicitamente sem ele.** As skills do Matt
começam com "o tracker deveria ter sido fornecido; se não, diga ao usuário para rodar
`/setup-…`". Elas param em vez de improvisar. Prompt degrada em silêncio; arquivo ausente para o
fluxo.

## Um detalhe que custa caro se ignorado

O `setup-matt-pocock-skills` **reescreve** o bloco `## Agent skills` do `CLAUDE.md`. Por isso
`/constituicao` escreve o ponteiro dela numa seção `## Constituição` de nível superior, fora daquele
bloco. Ponteiro colocado lá dentro é apagado na próxima vez que o setup rodar.

## Constituição: o que é e o que não é

A regra de validação vem do Spec Kit: princípio é **declarativo, verificável e sem linguagem vaga**.

Ser específico do domínio não é defeito. A constituição do próprio Spec Kit manda subclassar
`MarkdownIntegration` e rejeita `Optional` em favor de `str | None`. O que reprova um princípio é
vagueza, não especificidade.

| Vai para | Quando |
|---|---|
| `CONSTITUTION.md` | regra vinculante sobre toda alteração, com racional |
| spec (`/to-spec`) | comportamento de uma feature |
| ADR (`docs/adr/`) | uma decisão e o trade-off que a produziu |
| `CONTEXT.md` | definição de um termo do domínio |
| config do linter | preferência de formatação |

Detalhe do formato que quase todo mundo erra: o **relatório de impacto** no topo do arquivo é
material de trabalho para revisão humana e **sai antes do commit**. Não é histórico — o histórico é
o git. Relatórios empilhados de emendas antigas são lixo que empurra o documento para baixo.

## Desenvolver localmente

```bash
./scripts/link-skills.sh
```

Symlinka as skills deste repo em `~/.claude/skills` e `~/.agents/skills`, para editar e ver o efeito
na sessão seguinte sem republicar o plugin. Se você já instalou o plugin, desinstale antes
(`claude plugin uninstall israel-skills`) para não ficar com as skills em duplicidade.

## Créditos

O fluxo, a estrutura de buckets e as convenções de invocação são de
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT). O formato da constituição, a
disciplina de emenda e as regras de validação vêm de
[github/spec-kit](https://github.com/github/spec-kit) (MIT).

## Codex: skills e hooks de segredos

Migracao adicionada em 2026-10-20. As skills de governanca ja incluem `agents/openai.yaml`;
se o plugin `israel-skills` ja aparece no Codex, nao instale copias adicionais das skills.
A instalacao dos hooks abaixo e independente do plugin e nao muda os hooks do Claude.

Uma vez por maquina, na raiz deste repositorio:

```powershell
node scripts/install-codex-hooks.js --user
```

O comando usa `CODEX_HOME`, quando definido, ou `~/.codex`. Instala os scripts em
`hooks/israel-skills/` e faz merge em `hooks.json`. Preserva os outros eventos e hooks,
faz backup dos arquivos alterados e nao duplica a entrada quando repetido. Nao muda
`config.toml`, permissoes nem registros de confianca. Requer Node no PATH da sessao Codex.

Para instalar somente num projeto, em vez do escopo de usuario:

```powershell
node scripts/install-codex-hooks.js --project C:\caminho\do\projeto
```

Nao e necessario instalar nos dois escopos: os hooks se somam. Os comandos usam caminhos
absolutos para funcionar mesmo quando o agente esta num subdiretorio. Ao mover o projeto ou
copiar para outra maquina, execute o instalador novamente para ajustar esses caminhos.
Os instaladores `init-project.*` copiam os dois adaptadores. O setup instala as travas antes
dos plugins opcionais; sem Claude CLI, as travas continuam sendo instaladas. Com `--user`
ou `-User`, o Codex usa o escopo de usuario; sem essa opcao, usa somente o projeto.

### Ativacao obrigatoria no Codex

Abra uma nova sessao, use `/hooks`, revise a entrada **Israel skills: conferindo acesso a
segredos** e marque-a como confiavel. Hooks novos ou alterados ficam ignorados ate essa revisao.
No escopo de projeto, a camada `.codex/` tambem precisa ser confiavel. Uma politica gerenciada
pode desativar hooks ou permitir apenas os administrados; nesse caso, a instalacao de usuario
nao se sobrepoe a ela. Nao use bypass de confianca para validar a instalacao.

A documentacao oficial descreve o [contrato e a confianca dos hooks](https://learn.chatgpt.com/docs/hooks).
O Codex representa comandos de terminal como `Bash` no hook, inclusive `exec_command`;
`apply_patch` chega com o patch no campo `command`. O matcher desta instalacao cobre todos os
nomes de ferramentas locais suportadas, incluindo MCP, e o script examina seus argumentos.

### Verificacao sem segredos reais

```powershell
node template/.codex/hooks/test.js
node scripts/test-install-codex-hooks.js
node template/.claude/hooks/test.js
```

Os testes mandam payloads JSON ficticios ao hook e conferem a decisao, sem executar o comando
contido no payload. A bateria do instalador usa pasta temporaria. Para verificar a integracao
real apos confiar no hook, crie um projeto descartavel com uma `.env` contendo apenas um marcador
ficticio e um `.env.example` ficticio: a leitura do primeiro deve ser negada e a do exemplo permitida.
Isso e diferente de rodar os testes do script: estes nao provam que o aplicativo carregou o hook.
Nunca use um `.env` real como teste de ativacao.

### Limites da protecao

Esta migracao e uma barreira adicional para acessos explicitos, nao isolamento de arquivos.
O filtro nao interpreta completamente shell, JavaScript ou Python. Caminhos calculados, codigo
em scripts ja existentes, buscas amplas, links e ferramentas com argumentos desconhecidos podem
nao revelar o alvo ao hook. Ferramentas hospedadas e alguns caminhos especializados nao passam
por `PreToolUse`; entradas em uma sessao de terminal ja iniciada tambem nao o executam novamente.
Erros ou timeout do proprio hook podem nao bloquear a chamada no Codex.

Para garantir que um processo nao possa ler um segredo, use tambem restricoes reais do sistema
de arquivos/sandbox, definidas e verificadas para o ambiente. `.gitignore`, regras de prompt e
este filtro nao substituem essa restricao. Nao alteramos ACLs, politicas corporativas ou o
sandbox automaticamente como parte desta migracao.


## Manter as travas agnosticas de ferramenta

A fonte editavel e `guardrails/block-secrets.js`. O contrato JSON PreToolUse e compativel com
Claude e Codex; a descoberta/configuracao difere por ferramenta. Os adaptadores sao copias
identicas e autonomas para que os templates e hooks de usuario nao dependam deste checkout.
Nunca altere apenas uma copia. Depois de mudar a politica ou o instalador Codex:

```sh
node scripts/sync-guardrails.js
node scripts/sync-guardrails.js --check
node template/.codex/hooks/test.js
node template/.codex/hooks/test.js template/.claude/hooks/block-secrets.js
node template/.claude/hooks/test.js
node scripts/test-install-codex-hooks.js
```

O teste `--check` acusa divergencia entre as copias; novos casos de bloqueio e de acesso legitimo
precisam passar nos dois adaptadores. Ferramenta nova exige adaptador, documentacao da cobertura
e teste do carregamento: copiar um SKILL.md nao ativa uma trava. Projetos ja semeados precisam
receber novamente o template atualizado; a instalacao global Codex se atualiza repetindo `--user`.

Os manifests existentes continuam sendo a distribuicao das skills. Esta mudanca nao publica uma
nova versao de skills nem as instala em duplicidade. O commit da migracao e local ate ser enviado.

A esteira `.github/workflows/guardrails.yml` executa essa bateria em Windows e Linux e recusa
copias divergentes. Validacao local desta migracao: 66 casos por adaptador, 25 casos legados,
merge/idempotencia/backup do instalador e semeadura PowerShell em projeto descartavel. Nenhum
`.env` real foi aberto. O validador Claude atual aceita o marketplace; `plugin validate --strict`
acusa o aviso preexistente sobre CLAUDE.md na raiz, que nao e contexto distribuido pelo plugin.
As skills e os manifests nao foram alterados nesta migracao.
