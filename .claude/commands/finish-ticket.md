---
description: "Aprova o trabalho atual e finaliza: roda os gates SOBRE o merge, faz fast-forward na main, sobe e limpa a branch (e a worktree, se for dedicada). Uso: /finish-ticket"
argument-hint: "(nenhum — descobre o issue pela branch atual)"
allowed-tools: Bash(git branch:*), Bash(git status:*), Bash(git worktree list:*), Bash(git log:*), Bash(gh pr list:*), Bash(pwd)
---

## Estado atual

- Diretório: !`pwd`
- Branch atual: !`git branch --show-current`
- Working tree: !`git status --short`
- Worktrees: !`git worktree list`
- Últimos commits: !`git log --oneline -5`
- PR aberto (se houver): !`gh pr list --head "$(git branch --show-current)" --json number,title,url 2>/dev/null || echo "(sem gh ou sem PR)"`

## Sua tarefa

O usuário **aprovou** o trabalho desta branch. Finalize: rode os gates sobre o
resultado do merge, leve para a `main` por **fast-forward** (histórico linear, igual
ao resto do projeto), suba, e limpe a branch (e a worktree, se houver uma dedicada).
**Só publique se os gates passarem.** Nunca suba código vermelho.

Funciona onde você estiver — vale tanto pra worktree dedicada quanto pra branch criada
in-place. A topologia é detectada no passo 0.

### 0. Pré-checagem e detecção de modo (se falhar, PARE e avise — não tente contornar)
- A branch atual **não pode ser** `main`/`master`: este comando finaliza um ticket, não a main.
  Se for, pare.
- **Descubra o número `N` do issue**, nesta ordem: (1) se a branch casa `issue-N`, use esse número;
  (2) senão, pegue do PR aberto acima; (3) senão, do `Closes #N` nos commits da branch. Se nada
  disso resolver, PARE e pergunte qual é o issue.
- **Working tree precisa estar limpa** (tudo commitado). Se houver mudança não commitada,
  mostre o `git status` e **pergunte** se deve commitar antes (mensagem descritiva,
  terminando com `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`)
  ou parar. Não mergeie trabalho solto silenciosamente.
- A pasta atual precisa ter `node_modules/` (pra rodar os gates). Se não tiver, `npm install` nela.
- **Detecte o modo** olhando `git worktree list`. Chame a branch atual de `<B>`:
  - Existe uma worktree **separada** (caminho ≠ pasta atual) em `main`/`master`?
    - **SIM → modo "worktree dedicada"**: chame essa pasta de `<main>` e a pasta atual de `<wt>`.
      Você vai operar a main por `git -C <main>` e remover `<wt>` no fim.
    - **NÃO → modo "in-place"**: você criou `<B>` na própria pasta (a `main` não está aberta em
      outra worktree). Você vai finalizar aqui mesmo e **não** há worktree pra remover.

### 1. Atualizar a base e montar o merge
**Modo worktree dedicada:**
- Atualize a main local sem merge commit: `git -C <main> fetch origin` e
  `git -C <main> merge --ff-only origin/main`. Se não der fast-forward (main divergiu),
  PARE e reporte — não force.
- Na `<wt>`, rebaseie em cima da main atualizada: `git rebase main`. Isso deixa `<B>`
  **idêntica ao que a `main` vai virar** — é esse estado que vamos testar. Conflito → PARE,
  reporte os arquivos e deixe pro usuário resolver (não invente resolução).

**Modo in-place:**
- `git fetch origin`.
- Rebaseie `<B>` em cima do remoto: `git rebase origin/main`. Conflito → PARE e reporte.
  Agora `<B>` é exatamente o que a `main` vai virar.

### 2. Gates SOBRE o merge (na pasta atual, já rebaseada — é o "nesse merge" do pedido)
- `npm run build` — type-check estrito + build (falha em unused locals/params).
- `npm test` — lógica musical do core.
- **Se qualquer um falhar: PARE. Não suba nada.** A branch rebaseada fica como está pra
  consertar. Reporte a saída do erro.

### 3. Levar pra main e subir (só com tudo verde)
**Modo worktree dedicada:**
- `git -C <main> merge --ff-only <B>` (fast-forward; sem merge commit).
- `git -C <main> push origin main`.

**Modo in-place:**
- `git switch main` e `git merge --ff-only origin/main` (alinha a main local ao remoto;
  se não der ff, PARE e reporte).
- `git merge --ff-only <B>` (fast-forward; sem merge commit).
- `git push origin main`.

### 4. Limpar
- Branch local: delete seguro `branch -d <B>` (só apaga se mesclada) — `git -C <main> branch -d <B>`
  no modo dedicada, `git branch -d <B>` no modo in-place.
- Branch remota, se existir: `git push origin --delete <B>` — isso **fecha o draft PR** (os
  commits já estão na main via `Closes #N`). Se a branch remota não existir, ignore o erro.
- **Só no modo worktree dedicada**, remova a worktree por último: `git -C <main> worktree remove <wt>`.
  ⚠️ Se esta sessão está rodando dentro da `<wt>`, o diretório atual vai sumir após isso (o shell
  recupera pra outra pasta) — é esperado. No modo in-place **não há worktree pra remover**: você
  já está na `main` desta pasta.
- **Varra as refs de worktree arquivadas do Zed** (sempre, nos dois modos): quando o Zed arquiva
  uma thread/worktree, ele guarda um snapshot em `refs/archived-worktrees/*` (commits "WIP staged"/
  "WIP unstaged" autor "Zed") que poluem o grafo. Use `<r>` = `<main>` no modo dedicada (a `<wt>` pode
  já ter sumido) ou a pasta atual no modo in-place, e rode **os dois passos**:
  1. apaga as refs: `git -C <r> for-each-ref --format='%(refname)' refs/archived-worktrees | xargs -rn1 git -C <r> update-ref -d`
  2. **poda os objetos** (sem isso os commits viram *dangling* e o Zed ainda os mostra no grafo):
     `git -C <r> gc --prune=now --quiet`
  É um sweep best-effort: limpa o acumulado dos tickets anteriores; a ref deste ticket pode ser criada
  pelo Zed só *depois* que ele perceber a worktree sumir — o próximo `/finish-ticket` a remove. Depois
  pode ser preciso dar refresh no painel git do Zed pra ele reler.

### 5. Reportar
- Confirme em uma mensagem: gates verdes, `main` agora em `<hash>` e empurrada, issue
  **#N** fechado pelo `Closes #N`, PR fechado (se havia), branch removida (e worktree removida,
  se era modo dedicada). Diga ao usuário de onde seguir: `<main>` no modo dedicada, ou a própria
  pasta (agora na `main`) no modo in-place.
