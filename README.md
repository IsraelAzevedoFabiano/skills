# Skills de governança

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

Três comandos, na ordem, uma vez cada:

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
