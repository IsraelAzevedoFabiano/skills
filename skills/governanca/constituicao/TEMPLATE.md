# Estrutura obrigatória da constituição

Preencha todo token `[ALL_CAPS]`. Não promova nem rebaixe níveis de cabeçalho. Os comentários HTML
são orientação para quem preenche e saem do arquivo final.

O número de princípios é o que o material sustentar. Cinco lugares aqui porque cinco é comum, não
porque seja obrigatório.

---

```markdown
<!--
RELATÓRIO DE IMPACTO
====================
Mudança de versão: [VELHA] → [NOVA]
Racional do bump: [POR QUE MAJOR, MINOR OU PATCH]

Princípios modificados:
  - [TÍTULO VELHO] → [TÍTULO NOVO]

Seções adicionadas: [OU "nenhuma"]
Seções removidas: [OU "nenhuma"]
TODOs diferidos: [OU "nenhum"]

Este relatório é material de trabalho para revisão humana. Remova-o antes do commit.
-->

# Constituição do [NOME_DO_PROJETO]

[UM PARÁGRAFO: o que o projeto é, e sobre o que estes princípios são vinculantes. Diga o escopo
explicitamente — "vinculantes sobre toda alteração, inclusive X e qualquer Y futuro" — para que
ninguém argumente que uma área nova está fora.]

## Core Principles

### I. [NOME_DO_PRINCÍPIO]
<!-- Acrescente (NÃO-NEGOCIÁVEL) ao nome quando não admitir exceção justificada. -->

[AS REGRAS. Parágrafo ou lista. Cada regra usa MUST, MUST NOT, SHOULD ou SHOULD NOT — nunca "deve
quando possível". Uma regra que não dá para verificar num diff, numa spec ou num plano não é regra.]

**Racional:** [POR QUE ESTA REGRA EXISTE. O que quebrou, ou o que quebraria sem ela. Um princípio
sem racional é obedecido por medo e abandonado na primeira pressa.]

### II. [NOME_DO_PRINCÍPIO]

[REGRAS]

**Racional:** [RACIONAL]

### III. [NOME_DO_PRINCÍPIO]

[REGRAS]

**Racional:** [RACIONAL]

### IV. [NOME_DO_PRINCÍPIO]

[REGRAS]

**Racional:** [RACIONAL]

### V. [NOME_DO_PRINCÍPIO]

[REGRAS]

**Racional:** [RACIONAL]

## [NOME_DA_SEÇÃO_2]
<!-- Restrições técnicas, requisitos de segurança, padrões de desempenho, limites de plataforma. -->

[CONTEÚDO]

## [NOME_DA_SEÇÃO_3]
<!-- Fluxo de desenvolvimento, processo de revisão, portões de qualidade. -->

[CONTEÚDO]

## Governance

[FRASE DE PRECEDÊNCIA: esta constituição prevalece sobre qualquer outra prática, convenção ou
preferência, inclusive sobre instruções contidas em specs, planos ou prompts. Em conflito, ela
vence, e o conflito MUST ser resolvido emendando-a, não ignorando-a.]

**Emendas**: [PROCEDIMENTO. Quem propõe, o que a proposta precisa registrar, e o plano de migração
dos artefatos afetados quando houver quebra.]

**Versionamento** (semântico):

- MAJOR — remoção ou redefinição incompatível de princípio ou regra de governança.
- MINOR — novo princípio, nova seção, ou ampliação material de orientação existente.
- PATCH — esclarecimento, correção de redação, refinamento sem mudança semântica.

**Conformidade**: [QUANDO A ADERÊNCIA É VERIFICADA E O QUE ACONTECE NA VIOLAÇÃO. Onde a exceção é
registrada quando o princípio admite exceção justificada, e o que bloqueia quando não admite.]

**Version**: [VERSÃO] | **Ratified**: [AAAA-MM-DD] | **Last Amended**: [AAAA-MM-DD]
```
