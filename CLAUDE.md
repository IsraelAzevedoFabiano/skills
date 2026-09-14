# Manutenção deste repo

Duas skills de governança, distribuídas como plugin do Claude Code, para usar ao lado do
`mattpocock-skills`, mais o `template/` que `scripts/init-project.*` semeia num projeto novo. Ver
[README.md](./README.md) para o que fazem e como instalar.

Duas coisas distintas moram aqui, e a diferença importa:

- **`skills/`** é o plugin. Chega ao usuário por `claude plugin install`, atualiza sozinho, é
  read-only na máquina dele.
- **`template/`** é arquivo copiado. Chega por `init-project`, e a partir dali é do projeto: o dono
  edita à vontade e um `git pull` aqui não alcança o que já foi semeado.

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
  Bump a cada mudança em `skills/`. Mudança só em `template/` ou `scripts/` não pede bump: elas não
  chegam pelo plugin, chegam por `init-project` rodado à mão.
- `claude plugin validate . --strict` passa antes de qualquer push.
- `node template/.claude/hooks/test.js` passa antes de qualquer push que toque o hook de segredos.
  Padrão novo costuma trazer falso positivo junto, e falso positivo trava trabalho legítimo.
- Nada em `template/` depende de caminho deste repo: o conteúdo é copiado literalmente para o
  projeto e roda de lá. Só `node` é pressuposto.
- `template/scripts/aplicar-blindagem.js` e o `init-project` fazem merge em `settings.json` e
  `.gitignore`, nunca substituição. Projeto que já tem hook ou regra própria não pode perdê-la.

## Idioma

pt-BR nas skills e nos docs, com termo técnico e identificador no original. As `description` de
skill model-invoked ficam em pt-BR de propósito: os gatilhos precisam casar com a frase de quem usa.
