# O que reprova um princípio

Passe cada candidato por aqui antes de escrever. Um candidato que falha em qualquer teste volta para
reescrita ou vai para outro lugar.

## Teste 1: dá para verificar?

Pegue um diff, uma spec ou um plano hipotético e tente dizer "aderiu" ou "violou". Se a resposta
depender de gosto, o princípio é vago.

- ❌ "O código deve ser legível e bem estruturado."
- ✅ "Módulo privado é prefixado com `_` e MUST NOT ser importado através de fronteira de pacote."

## Teste 2: a força está declarada?

Toda regra usa MUST, MUST NOT, SHOULD ou SHOULD NOT. "Deve quando possível", "preferencialmente" e
"evitar" não são força, são desejo.

- ❌ "Evitar dependências novas sempre que possível."
- ✅ "Zero dependência de runtime nova por padrão. Adicionar uma exige acordo do mantenedor e a
  justificativa de que nenhuma das existentes serve."

## Teste 3: tem racional?

Um princípio sem o porquê é obedecido por medo e abandonado na primeira pressa. O racional diz o que
quebrou, ou o que quebraria sem a regra.

## Teste 4: é governança, ou é outra coisa?

| Se o candidato é… | O lugar dele é |
|---|---|
| implementação de uma feature, comportamento de uma tela, contrato de um endpoint | uma spec (`/to-spec`) |
| uma decisão pontual e o trade-off que a produziu | um ADR (`/grill-with-docs`) |
| definição de um termo do domínio | o `GLOSSARY.md` (`/grill-with-docs`) |
| preferência de formatação que a ferramenta já impõe | a configuração do linter |
| passo de um procedimento operacional | a seção de fluxo, não a de princípios |

## Teste 5: o `(NÃO-NEGOCIÁVEL)` se sustenta?

O rótulo significa: nenhuma exceção, nem justificada, nem "só desta vez". Se você consegue imaginar
um caso em que o time aceitaria a violação com justificativa registrada, então o princípio é
negociável e o rótulo sai. Se tudo é não-negociável, nada é.

## Teste 6: não colide com o que já existe?

- Colide com outro princípio da mesma constituição? Um dos dois está errado. Resolva antes de
  escrever, não depois.
- Colide com um ADR? Traga à tona explicitamente, no formato do `domain-modeling`: _"Contradiz o
  ADR-000N (título), mas vale reabrir porque…"_. Nunca sobrescreva um ADR em silêncio.
- Repete uma regra que já está imposta estruturalmente? Não é motivo para cortar — o princípio é o
  porquê, e a estrutura é o como. Mas cite onde a estrutura o impõe, para que a próxima pessoa não
  procure.

## Teste 7: o corpo cumpre o que o título promete?

Uma condição no corpo pode esvaziar a regra sem que ninguém perceba, porque quem lê fica com o
título. Para cada "quando", "se", "salvo", "exceto" e "sempre que possível", pergunte: quem decide
se a condição vale? Se é o próprio agente, no momento de obedecer, a regra virou opcional.

- ❌ Título "Teste sempre, e antes (NÃO-NEGOCIÁVEL)", corpo "teste antes do código **quando há
  contrato a cumprir**". Todo código cumpre algum contrato, ou nenhum: o agente escolhe, e escolhe
  o caminho curto. Na prática, o teste veio depois.
- ✅ "Comportamento novo MUST nascer de um teste que roda e falha antes do código de produção. As
  exceções são estas, e só estas: <lista fechada, cada uma verificável no diff>."

A condição legítima é **fechada e verificável**: uma lista que dá para conferir num diff (arquivo de
migração gerado, código de protótipo descartável em `prototype/`). Condição aberta ("quando fizer
sentido", "quando houver contrato", "se for complexo") reprova. Num princípio `(NÃO-NEGOCIÁVEL)`,
qualquer condição precisa sobreviver a este teste, senão o rótulo é mentira.

Releia o título contra o corpo. Título que promete mais do que o corpo exige reprova, mesmo com
cada frase do corpo verificável.

## Especificidade não é defeito

A constituição do próprio Spec Kit exige subclassar `MarkdownIntegration`, proíbe `Optional` em
favor de `str | None` e fixa que o `key` da integração case com o nome do executável. É específica
até o osso e é constituição legítima: são regras checáveis, com racional, vinculantes sobre toda
alteração.

O que reprova é vagueza, não especificidade. Não recuse um princípio por ser detalhado demais;
recuse por não dar para verificar.
