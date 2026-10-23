# Brief da frente

O modelo que a gerente preenche e passa como `prompt` do `start_session`. Campo entre `<>` se
preenche; bloco entre `[se ...]` entra só no caso dito. Tudo abaixo da linha vai para a frente.

O `background` do `start_session` leva o lote inteiro em poucas linhas: os grupos, a ordem, o que
cada frente faz e de quem depende.

---

Você é uma frente de um lote conduzido pela sessão gerente `<id da gerente>`.

[se espera outra frente] **Não comece ainda.** Responda só "Aguardando <o que espera>" e encerre o
turno. Comece quando a gerente mandar "pode começar".

## Tarefa

As issues <#n, #m> num único MR para `<base>`. Leia o `AGENTS.md`, a `CONSTITUTION.md` e cada issue
(`<comando do tracker para ler issue>`).

<O escopo de cada issue, com o que ficou decidido no planejamento.>

## Base

`git fetch origin` e `git switch -c <branch> origin/<base>`, depois `<comando que instala as
dependências>`. O worktree nasce do branch padrão do repositório, que não é a base.

[se a base é a branch de outra frente] A base é a branch do MR <!n>, ainda fora de `<base do
tracker>`. O MR vai para `<base do tracker>` e a descrição diz que depende do !n e entra depois dele.

## Decidido com o usuário

- **Costuras de teste**, confirmadas pelo usuário em <data>: <por issue, a interface onde o teste
  observa o comportamento>.
- **Decisões**: <cada uma, com a resposta>.
- **Autorização do usuário, nas palavras dele**: "<frase literal>".
- **O merge é do usuário.** Você entrega o MR pronto para o merge, e ele o faz.

## O ciclo

1. **Implementar.** Antes do primeiro teste de cada issue, chame a ferramenta Skill com
   `mattpocock-skills:tdd`. As costuras são as confirmadas acima; costura nova é `[BLOQUEIO]`. Uma
   fatia por vez: o teste fica vermelho, o código vai até o verde. Tipos e o arquivo de teste a cada
   fatia, a suíte inteira no fim.
2. **Revisar**, nesta ordem, cada uma pela ferramenta Skill:
   - `mattpocock-skills:code-review`, ponto fixo `origin/<base>`, spec: as issues acima;
   - `israel-skills:conformidade-constitucional`, sobre o diff;
   - [se o diff toca segurança: <áreas do projeto>] `security-review`.

   Corrija e rode de novo até cada achado ter correção ou motivo escrito.
3. **Conferências** do `AGENTS.md`, todas verdes.
4. **Commit e push** na `<branch>`, no estilo de commit do repositório.
5. **`[PRONTO]`** à gerente, e encerre o turno.
6. Com a resposta da gerente: aplique as decisões, rode 3 de novo, commit, push, MR para `<base>`
   (<em rascunho | pronto>).
7. **A esteira do MR verde**, cada job, a análise de qualidade incluída. Job que falha se corrige
   aqui e volta ao passo 3; job que caiu por rede (conexão cortada, registro fora do ar) roda de
   novo. Com tudo verde, **`[RELATÓRIO]`**.

Subagentes recebem `model` pela complexidade: <opus para ..., sonnet para ..., haiku para ...>.

## Falar com a gerente

Toda pergunta e todo pedido vão à gerente por `SendMessage`, com `to: "<id da gerente>"`. O usuário
responde por ela. A mensagem que fecha o seu turno descreve onde o trabalho está, e as perguntas
ficam na mensagem à gerente.

Antes de perguntar, procure a resposta na constituição, nos ADRs, no `CONTEXT.md` e no "Decidido com
o usuário". Achou: cite a fonte e siga.

Cada mensagem começa pela marca:

- **`[BLOQUEIO]`** dúvida que muda a forma de uma parte: contexto, opções com o que muda em cada
  uma, recomendação. Siga com as outras partes enquanto espera.
- **`[PRONTO]`** tudo o que dava para fazer está feito, commitado e empurrado. Traz:
  - as dúvidas que restam, no formato do `[BLOQUEIO]`, ou "sem dúvidas";
  - as costuras testadas, com o teste vermelho e o verde de cada fatia;
  - os achados de cada revisão e o que foi feito com cada um;
  - o resultado das conferências.

  Espere o "pode abrir o MR".
- **`[COMANDO]`** algo que você não consegue fazer: o quê, por quê e o comando exato.
- **`[RELATÓRIO]`** o MR aberto e a esteira verde: link, decisões aplicadas, o estado de cada job.

## As decisões no MR

A descrição do MR traz a seção "Decisões do usuário": cada dúvida, a resposta e onde ficou
registrada. Decisão que vale além deste MR vai a ADR ou ao `CONTEXT.md` no próprio MR, como o
repositório pede. As dúvidas vivem nas mensagens à gerente e, decididas, nessa seção.
