---
name: conduzir-lote
description: "Conduz um lote de issues em sessões vinculadas a partir de um chat principal: planeja com o usuário, abre as sessões, responde a elas, traz as dúvidas para o chat e revisa cada MR. Rode quando quiser implementar várias issues sem sair desta conversa."
disable-model-invocation: true
---

# Conduzir lote

Esta sessão é a **gerente**. As sessões que ela abre são as **frentes**: cada frente implementa um
grupo de issues e abre um MR. Tudo se organiza por uma regra: **a frente fala só com a gerente, e o
usuário fala só com a gerente**. Pergunta, pedido de comando e decisão passam por este chat; o
usuário responde aqui e não precisa abrir outra sessão nem o tracker.

Antes do passo 1, leia o `AGENTS.md` ou `CLAUDE.md` do repositório (conferências, tracker,
etiquetas) e a `CONSTITUTION.md`, se houver.

## 1. Planejar com o usuário

As frentes só abrem quando o plano está acordado. Leve ao usuário, numa conversa:

- **Os grupos e a ordem.** Leia cada issue e agrupe pelos arquivos que ela toca. O que mexe nos
  mesmos arquivos vai junto ou em sequência; o que não se cruza corre em paralelo. Para cada par em
  sequência, diga a dependência real (a base, os arquivos). Tamanho de cada grupo: um MR que se
  revisa de uma vez.
- **As costuras de teste** de cada issue: a interface pública onde o teste observa o comportamento,
  no vocabulário da skill `tdd`. A `tdd` exige costura confirmada pelo usuário antes do primeiro
  teste; confirmadas aqui, a frente roda a skill sem parar.
- **As dúvidas previsíveis**: tudo o que a issue deixa "a decidir" (piso, nome, ambiente, escopo).
  Decidida agora, a dúvida sai do caminho da frente.
- **Modelo e esforço** de cada frente e o critério para os subagentes dela.
- **As autorizações, nas palavras do usuário**: commit, push, abrir MR, em rascunho ou pronto.
  Anote a frase literal. A permissão automática da frente nega a ação cuja ordem vem só da gerente,
  e aceita a que traz a autorização do usuário citada.
- **Permissões do repositório**, com o sim do usuário: liberar `git commit`, `git push` e a criação
  de MR nas configurações do projeto (Call the Skill tool with "update-config"), para nenhuma frente
  parar por permissão.

Concluído quando cada grupo tem issues, base, costuras confirmadas, decisões tomadas e as
autorizações em frase literal.

## 2. Abrir as frentes

No mesmo turno em que o usuário aprova o plano. `start_session` só abre em turno do usuário: em
turno disparado por aviso de outra sessão, a abertura é recusada. Por isso todas as frentes abrem
agora, e a que depende de outra recebe no brief a ordem de aguardar o sinal da gerente.

- Pegue o id desta sessão com `get_session` (`"self"`).
- Monte cada brief a partir de [BRIEF.md](BRIEF.md), com cada campo preenchido. O protocolo de
  mensagens mora lá e segue inteiro no brief.
- `start_session` com `initiation: "user_asked"`, `use_worktree: true` e o `model` e o `effort` do
  plano.
- Aplique às issues de cada frente que começou a etiqueta de trabalho em andamento do tracker (ver
  `docs/agents/triage-labels.md` ou equivalente). A frente em espera ganha a etiqueta junto com o
  sinal.

Concluído quando cada grupo tem frente aberta, e cada brief tem o id da gerente, as costuras, as
decisões e as autorizações literais.

## 3. Conduzir

O aviso de uma frente chega como `<side-sessions-event>` ou `<cross-session-message>`. A primeira
palavra da mensagem é a marca do protocolo (ver BRIEF.md). Para cada marca:

- **`[BLOQUEIO]`**: dúvida que muda a forma de uma parte. Se a constituição, um ADR ou o plano
  decidem, responda citando a fonte. Senão, leve ao usuário agora e devolva a resposta.
- **`[PRONTO]`**: a frente fez tudo o que podia, empurrou a branch e parou antes do MR. Revise
  (passo 4, itens 1 e 2). Ciclo incompleto ou defeito no diff volta à frente antes de chegar ao
  usuário. Com a revisão limpa, junte as dúvidas desta frente às de outras que estiverem prontas e
  leve ao usuário num lote. Devolva as respostas com "pode abrir o MR".
- **`[COMANDO]`**: algo que a frente não consegue fazer. O que você consegue (rodar job de novo,
  ler log, mudar etiqueta, consultar API), faça e responda. O que só o usuário consegue
  (configuração do tracker ou do servidor de análise, login, skill que só ele invoca), diga a ele o
  quê, onde e o comando exato, com o link da sessão quando o passo for lá: `[título](#local_<id>)`.
- **`[RELATÓRIO]`**: o MR está aberto. Passo 4, itens 3 e 4.
- **Sem marca**: leia o fim do turno com `list_events`. Aviso de fim de turno não é tarefa pronta:
  a frente pode estar esperando subagente ou rodada longa e retoma sozinha. Turno que caiu por limite
  de uso ou erro se retoma com `SendMessage`: "retome de onde parou".

O sinal para a frente em espera sai depois da revisão da frente de que ela depende, por
`SendMessage`: "pode começar", a base que ela usa, e o que a anterior mudou que a afeta.

### Perguntar ao usuário

- Cada dúvida em contexto de duas linhas, as opções com o que muda em cada uma, a recomendação
  primeiro. `AskUserQuestion`, até quatro por chamada; com o usuário em Remote Control ou fora do
  app, texto numerado.
- Devolva a resposta à frente citando as palavras do usuário entre aspas. A permissão da frente
  aceita aprovação citada; paráfrase da gerente conta como ordem da gerente.

## 4. Revisar cada MR

1. **O ciclo rodou.** `node <pasta desta skill>/scripts/conferir-ciclo.js <pasta do worktree da
   frente> --branch <branch local do worktree> --exigir mattpocock-skills:tdd,mattpocock-skills:code-review,israel-skills:conformidade-constitucional`
   (mais `security-review` quando o brief a pede) lista as skills chamadas, com os argumentos, e os
   subagentes, com o modelo. Skill exigida que falta volta à frente, com o nome da que falta.
2. **O diff** contra a base, lido por você. Arquivo de outra branch se lê com
   `git show <ref>:<caminho>`; no Windows, worktree em pasta funda estoura o limite de caminho.
3. **A esteira.** A frente só manda `[RELATÓRIO]` com a pipeline do MR verde, a análise de qualidade
   incluída. Confira no tracker; job vermelho volta à frente antes de chegar ao usuário.
4. **Os conflitos.** `node <pasta desta skill>/scripts/simular-merges.js origin/<base> <ref> ...`, na
   ordem de merge proposta, com os MRs abertos de fora do lote que tocam os mesmos arquivos. O
   roteiro para no primeiro conflito, porque o que vem depois depende da resolução: para ver os
   seguintes, rode de novo sem a ref que conflitou, ou depois que ela for resolvida.

Concluído quando o ciclo está completo, o diff lido, a pipeline verde e os conflitos conhecidos.
Então apresente ao usuário: o que o MR faz, as decisões dele aplicadas, suas observações sem
bloqueio e os conflitos previstos, com a ordem de merge.

## 5. Fechar

- Depois de cada merge, os MRs abertos do lote ficam sem conflito com a base atual, conferido no
  tracker. A frente traz a base, roda as conferências e empurra.
- Comentário na issue que o critério de aceite pede (placar, decisão) sai com o sim do usuário.
- Frente se arquiva com o sim do usuário.
