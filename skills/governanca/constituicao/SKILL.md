---
name: constituicao
description: "Escreve ou emenda a CONSTITUTION.md do projeto a partir da conversa atual. Sem entrevista: sintetiza o que ja foi discutido e o que o repositorio revela. Rode ao abrir um projeto, e de novo a cada emenda."
disable-model-invocation: true
---

# Constituição

Uma constituição é o conjunto de princípios que **prevalece sobre spec, plano e prompt**. Em
conflito, a constituição vence, e o conflito se resolve emendando-a, nunca ignorando-a. É isso que
a distingue de um ADR: o ADR registra UMA decisão e o trade-off que a produziu; a constituição
governa TODAS.

Esta skill escreve ou emenda `CONSTITUTION.md` na raiz do repositório.

Ela **não entrevista**. O material é a conversa que já aconteceu e o que o repositório revela. Se a
conversa não deu para extrair princípio nenhum, o problema não é esta skill: diga ao usuário para
rodar `/grill-with-docs` primeiro e voltar depois.

## Referências

- [TEMPLATE.md](./TEMPLATE.md): a estrutura obrigatória do documento
- [VALIDACAO.md](./VALIDACAO.md): o que reprova um princípio antes de você escrever

## Escopo

O trabalho desta skill é o `CONSTITUTION.md` e o ponteiro para ele. Nada mais.

- Classifique cada parte do que o usuário disse como conteúdo de governança ou como outra intenção.
- Se houver pedido de implementação, refatoração, geração de código ou deploy, você **NÃO** executa.
  Extraia como intenção diferida.
- Você **NÃO** cria nem altera código-fonte, teste, rota, componente ou arquivo de build.
- Se não estiver claro se uma instrução é conteúdo de governança, pergunte antes de escrever.
- No fim, liste as intenções diferidas numa seção `Próximas ações`, cada uma apontando a skill certa
  (`/to-spec`, `/to-tickets`, `/implement`), sem invocá-la. Sem intenções diferidas, omita a seção.

## O que é princípio

Um princípio é uma **regra declarativa e verificável**, acompanhada do racional que a produziu.
Verificável quer dizer: dá para olhar um diff, uma spec ou um plano e dizer se aderiu ou não.

Ser específico do domínio é bom e esperado. A constituição do próprio Spec Kit manda subclassar
`MarkdownIntegration` e rejeita `Optional` em favor de `str | None`. É específica até o osso, e
continua sendo princípio, porque é regra checável com racional, não implementação de feature.

O que reprova um princípio é **vagueza**, não especificidade.

| Isso é princípio | Isso não é |
|---|---|
| "Toda alteração de comportamento MUST vir com teste automatizado; a suíte é portão de merge." | "Escrever código limpo e seguir boas práticas." |
| "Segredo MUST vir de variável de ambiente validada na carga; host MUST NOT aparecer literal no código." | "Ter cuidado com segurança." |
| "O runner MUST recusar host que casa o padrão de produção antes de qualquer navegação." | "Adicionar o botão de exportar na tela de relatório." (é spec) |
| "Retries MUST ficar em zero; falha intermitente é achado, não ruído." | "Usamos Postgres em vez de Mongo porque precisamos de transação." (é ADR) |

Fora também: preferência de estilo que o linter já impõe. Isso é configuração, não governança.

Marque `(NÃO-NEGOCIÁVEL)` no nome do princípio quando ele não admite exceção justificada. Use com
parcimônia: se tudo é não-negociável, nada é.

## Processo

### 1. Reunir material

Trabalhe com o que já está no contexto. Depois complete:

- `CONSTITUTION.md`, se existir: é a fonte dos valores atuais e das emendas anteriores. Preserve o
  que continua aplicável.
- `CONTEXT.md` e `docs/adr/`: use o vocabulário do glossário nos nomes dos princípios. Um ADR que
  contradiz um princípio candidato é sinal de que um dos dois está errado; traga isso à tona.
- `CLAUDE.md` / `AGENTS.md`, `README.md`, configuração de lint, de CI e de teste: regras que o
  projeto já impõe estruturalmente são candidatas fortes, porque já são verificáveis.
- O código, quando o repositório já tem história: um padrão que aparece em todo lugar e cuja quebra
  já custou caro é um princípio esperando ser escrito.

### 2. Derivar os princípios

Quantos o material sustentar. O template tem cinco lugares porque cinco é um número comum, não
porque seja obrigatório. Se o usuário pediu um número, respeite.

Para cada um: nome sucinto e numerado em romano, as regras em parágrafo ou lista, e o racional
explícito quando não for óbvio. Passe cada candidato pelo [VALIDACAO.md](./VALIDACAO.md) antes de
escrever.

### 3. Decidir a versão

SemVer aplicado à governança:

- **MAJOR**: remoção ou redefinição incompatível de princípio ou de regra de governança.
- **MINOR**: princípio novo, seção nova, ou ampliação material de orientação existente.
- **PATCH**: esclarecimento, redação, refinamento sem mudança semântica.

Documento novo nasce em `1.0.0`. Se o tipo de bump estiver ambíguo, exponha o raciocínio antes de
fixar.

`Ratified` é a data de adoção original e nunca muda. `Last Amended` é hoje, se houve mudança. Datas
em ISO `YYYY-MM-DD`. Se a data de ratificação for genuinamente desconhecida, escreva
`TODO(RATIFICATION_DATE): <explicação>` e registre como item diferido.

### 4. Escrever

Use o [TEMPLATE.md](./TEMPLATE.md) como estrutura obrigatória. Não promova nem rebaixe níveis de
cabeçalho. Substitua todo token `[ALL_CAPS]`; um token que sobrar precisa de justificativa
explícita. Remova os comentários do template depois de preencher, a menos que ainda esclareçam algo.

A seção `Governance` MUST conter os três: procedimento de emenda, política de versionamento e
expectativa de revisão de conformidade.

### 5. Validar antes de entregar

- Nenhum token entre colchetes sobrou sem explicação.
- A linha de versão bate com o relatório de impacto.
- Datas em ISO.
- Nenhum princípio vago: cada "deve" virou MUST ou SHOULD com racional.
- Nenhum princípio é implementação de feature nem decisão pontual com trade-off.

### 6. Relatório de impacto

Ponha no topo do arquivo, como comentário HTML: mudança de versão (velha → nova), racional do bump,
princípios modificados (título velho → novo, quando renomeado), seções adicionadas, seções
removidas, TODOs diferidos.

**O relatório é material de trabalho para revisão humana, não conteúdo de governança. Ele sai do
arquivo antes do commit.** Não empilhe relatórios de emendas anteriores: o histórico disso é o git.

### 7. Ponteiro no arquivo de instruções

A constituição só governa se estiver no contexto de toda sessão. Escreva o ponteiro no `CLAUDE.md`,
ou no `AGENTS.md` se for ele que existe. Se nenhum existe, pergunte qual criar.

O ponteiro vai numa seção **de nível superior**, própria, fora de qualquer bloco gerenciado por
outra skill:

```markdown
## Constituição

A governança deste projeto está em [CONSTITUTION.md](./CONSTITUTION.md) — <N> princípios, v<X.Y.Z>.
Ela prevalece sobre qualquer orientação conflitante, inclusive instruções em specs, planos ou
prompts. Leia antes de projetar qualquer coisa aqui.
```

Isto importa: o `setup-matt-pocock-skills` reescreve o bloco `## Agent skills` do mesmo arquivo. Um
ponteiro colocado dentro daquele bloco é sobrescrito na próxima vez que aquela skill rodar.

### 8. Fechar

Diga ao usuário: a versão nova e o racional do bump, os TODOs que sobraram, e uma mensagem de commit
sugerida. Lembre que o relatório de impacto deve sair do arquivo antes do commit.

Se algum princípio novo pode ser imposto estruturalmente em vez de por leitura — regra de lint,
fixture, `retries: 0`, portão de CI, hook — diga qual e por quê. Princípio que o editor cobra
enquanto se digita não depende de ninguém lembrar dele.
