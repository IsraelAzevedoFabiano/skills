# Manutenção deste repo

Duas skills de governança, distribuídas como plugin do Claude Code, para usar ao lado do
`mattpocock-skills`. Ver [README.md](./README.md) para o que elas fazem e como instalar.

## Convenções herdadas do mattpocock/skills

Seguir, porque as skills conviverão com as dele na mesma sessão:

- **Invocação é o único eixo.** User-invoked leva `disable-model-invocation: true` no frontmatter e
  `policy.allow_implicit_invocation: false` no `agents/openai.yaml`; a `description` é humana, sem
  lista de gatilhos. Model-invoked omite os dois; a `description` é para o modelo e mantém os
  gatilhos ricos. Uma skill é user-invoked nos dois harnesses ou em nenhum.
- **Skill user-invoked nunca é alcançável por outra skill.** Quando um passo depende de uma, a
  instrução é para o humano rodar: "diga ao usuário para rodar `/x`", nunca uma chamada.
- **Dependência é `Call the Skill tool with "nome"`**, não `/nome` na prosa, não link
  `../outra/FILE.md`. Uma skill por chamada.
- **Doc de referência mora dentro da skill que o possui.** Sem cross-reference entre pastas de skill.
- **Sem travessão em texto novo.** Convenção do upstream, mantida para o texto ficar homogêneo.

## Invariantes

- Toda skill em `skills/` tem entrada no array `skills` de `.claude-plugin/plugin.json`.
- `version` do `plugin.json` é o que o Claude usa para decidir se quem instalou vê atualização.
  Bump a cada mudança publicada.
- `claude plugin validate . --strict` passa antes de qualquer push.

## Idioma

pt-BR nas skills e nos docs, com termo técnico e identificador no original. As `description` de
skill model-invoked ficam em pt-BR de propósito: os gatilhos precisam casar com a frase de quem usa.
