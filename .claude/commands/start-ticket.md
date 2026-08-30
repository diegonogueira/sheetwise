---
description: "Implementa um issue do GitHub de ponta a ponta (lê, codifica, valida, revisa, abre draft PR). Uso: /start-ticket <numero>"
argument-hint: <numero-do-issue>
allowed-tools: Bash(gh issue view:*), Bash(git branch:*), Bash(git status:*), Bash(git worktree list:*), Bash(pwd)
---

## Contexto do ticket #$ARGUMENTS

- Diretório: !`pwd`
- Branch atual: !`git branch --show-current` (vazio = detached HEAD)
- Working tree: !`git status --short`
- Worktrees: !`git worktree list`
- Issue:

!`gh issue view $ARGUMENTS --comments`

## Sua tarefa

Implemente o issue #$ARGUMENTS acima de ponta a ponta e **pare num draft PR** para revisão humana.
**Nunca faça merge** — quem mergeia é o usuário.

### 0. Preparar a branch (rode onde você estiver: main, detached ou worktree)
Não exigimos worktree dedicada. A única regra firme é: **nunca trabalhe direto na `main`/`master`** —
o trabalho do ticket vai numa branch dedicada. Veja a branch atual acima e escolha o caso:

- **Já está em `issue-$ARGUMENTS`** (ou numa branch que claramente é deste issue): use-a, segue direto.
- **Está numa branch sua qualquer** (não `main`/`master`, não detached): pode seguir nela — trate a
  branch atual como a branch do ticket. Não renomeie nem force `issue-$ARGUMENTS`.
- **Está na `main`/`master` ou em detached HEAD, com a working tree LIMPA**: crie a branch aqui mesmo,
  a partir do `origin/main` atualizado, sem sair da pasta:
  `git fetch origin && git switch -c issue-$ARGUMENTS origin/main`
  (Isso troca a branch desta pasta — é o comportamento "rode onde eu estiver". Se preferir isolar numa
  worktree separada, dá pra `git worktree add ../sheetwise-issue-$ARGUMENTS -b issue-$ARGUMENTS origin/main`
  e rodar lá, mas isso é **opcional**.)
- **Está na `main`/`master`/detached com a working tree SUJA**: PARE e pergunte se deve commitar/guardar
  as mudanças soltas antes de criar a branch. Não crie a branch por cima de edições não combinadas.

Daqui pra frente, **"a branch do ticket" = a branch atual** (`git branch --show-current`). Use esse nome
real em push/PR — não assuma `issue-N` às cegas.

- Se `node_modules/` não existir nesta pasta (checkout novo), rode `npm install` antes dos gates.

### 1. Entender e planejar
- Releia o `CLAUDE.md`: `src/core/` é a fonte única da verdade e é pura; MIDI é a lingua
  franca; cuidado com a ordenação de cordas (low→high) e com o gotcha do `+12` da partitura.
- Esboce mentalmente o que muda. Se o issue estiver ambíguo a ponto de você ter que adivinhar
  uma decisão de produto, pare e pergunte em vez de chutar.

### 2. Implementar
- Construa novos modos de treino sobre `src/core`, sem duplicar lógica de nota.
- Siga o estilo do código vizinho (nomes, idiomas, densidade de comentário).

### 3. Validar (gates obrigatórios — precisam passar)
- `npm run build` — type-check estrito + build; falha em unused locals/params.
- `npm test` — lógica musical do core.
- Se houve mudança de UI sem teste, verifique no browser headless conforme a seção
  "Verifying UI changes" do `CLAUDE.md`.
- Conserte tudo antes de seguir. Não abra PR com gate vermelho.

### 4. Auto-review
- Rode `/code-review` sobre o diff e trate os achados de verdade.
- Se o diff tocar entrada do usuário, áudio/rede, persistência (localStorage) ou algo
  sensível, rode também `/security-review`.

### 5. Entregar (sem merge)
- Commit descritivo referenciando o issue. Termine a mensagem com:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Suba a branch atual com o mesmo nome: `git push -u origin HEAD`.
- Abra **draft PR**: `gh pr create --draft --base main` com título claro e corpo contendo
  `Closes #$ARGUMENTS`, um resumo do que foi feito + decisões tomadas, e um "como testar". Termine
  o corpo do PR com: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- Reporte o link do PR e **pare**. Não mergeie, não feche o issue na mão.
