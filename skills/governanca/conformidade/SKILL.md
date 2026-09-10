---
name: conformidade-constitucional
description: "Confere uma spec, um conjunto de tiquetes, um plano ou um diff contra a CONSTITUTION.md do repositorio, principio por principio, e diz o que viola e quais sao as duas saidas. Use ao escrever uma spec, ao quebrar trabalho em tiquetes, ao planejar ou revisar implementacao, e sempre que a conversa citar constituicao, principio, governanca, ou perguntar se algo e permitido neste projeto."
---

# Conformidade constitucional

O portão que faz a constituição morder. Ela prevalece sobre spec, plano e prompt, mas só na medida
em que alguém confere; esta skill é a conferência.

## Quando não fazer nada

Se não existe `CONSTITUTION.md` na raiz do repositório, **retorne em silêncio**. Não avise, não
sugira criar uma, não trate a ausência como problema. Um projeto sem constituição não tem nada a
conferir. (A skill `/constituicao` cria uma quando o usuário quiser.)

## O artefato sob conferência

O que estiver em jogo agora: uma spec sendo escrita, um conjunto de tíquetes sendo derivado, um plano
de implementação, um diff, ou uma decisão de desenho em discussão. Se não estiver claro qual, use o
mais recente da conversa. Não peça ao usuário para escolher quando o contexto já diz.

## Processo

### 1. Ler a constituição inteira

Toda ela, não só os títulos. Um princípio tem regras no corpo que o nome não revela, e é no corpo que
está a força (MUST, MUST NOT, SHOULD) e o racional.

Note quais princípios estão marcados `(NÃO-NEGOCIÁVEL)`. Eles têm consequência diferente.

### 2. Classificar princípio por princípio

Para cada princípio, uma das três:

- **Aderente** — o artefato satisfaz a regra. Diga em uma linha por quê, não só o rótulo.
- **Não se aplica** — o artefato não toca a área que o princípio governa. Uma linha dizendo isso.
- **Viola** — o artefato contraria a regra. Aqui o detalhe é obrigatório.

Não invente uma quarta categoria. "Parcialmente aderente" é violação com desconto: se alguma parte
contraria a regra, é violação.

### 3. Detalhar cada violação

Para cada uma, quatro coisas:

- **Qual princípio**, pelo número e nome.
- **Qual regra**, citada do corpo do princípio, não parafraseada.
- **O que no artefato viola**, apontado concretamente: o arquivo e a linha, o passo da spec, o
  tíquete pelo número. "A abordagem geral conflita" não serve.
- **As duas saídas**, sempre as duas:
  1. **Mudar o artefato** — o que precisaria mudar, especificamente.
  2. **Emendar a constituição** — rodar `/constituicao`, com o bump que a emenda exigiria. Ofereça
     esta saída quando a violação revelar que o princípio é que está errado, e diga isso quando for o
     caso.

Nunca há uma terceira saída. Não dilua o princípio, não sugira exceção não registrada, não conclua
que "neste caso tanto faz".

### 4. Relatar

Uma tabela compacta com o veredito de cada princípio, e depois as violações em detalhe. Só as
violações ganham corpo; aderente e não-se-aplica ficam na tabela.

```
| Princípio | Veredito | Nota |
|---|---|---|
| I. <nome> (NÃO-NEGOCIÁVEL) | Viola | <uma linha> |
| II. <nome> | Aderente | <uma linha> |
| III. <nome> | Não se aplica | <uma linha> |
```

Feche com a consequência, e ela depende do rótulo:

- Violação de princípio **NÃO-NEGOCIÁVEL**: **bloqueia**. O artefato não segue como está. As saídas
  são mudar o artefato ou emendar a constituição, e emendar um não-negociável é bump MAJOR.
- Violação de princípio negociável: exige **justificativa explícita e registrada** no próprio
  artefato, na seção de exceções da spec ou do plano. Sem o registro, também bloqueia. Uma exceção
  que ninguém escreveu não é exceção, é esquecimento.

### 5. Não conserte por conta própria

Esta skill **relata**. Ela não reescreve a spec, não move o tíquete, não corrige o código. Quem
decide entre as duas saídas é o usuário, e a decisão pode ser emendar a constituição — o que esta
skill nunca faz sozinha.

A exceção é quando você já está no meio de escrever o artefato e a violação é sua: aí corrija antes
de entregar, e diga que corrigiu e por qual princípio.

## Conflito entre princípios

Se o artefato só pode aderir a um princípio violando outro, a constituição tem um defeito, e o
defeito é a notícia. Relate os dois princípios, mostre por que são incompatíveis neste caso, e
encaminhe para `/constituicao`. Não escolha um dos dois em silêncio, e não invente uma ordem de
precedência que a constituição não declara.
