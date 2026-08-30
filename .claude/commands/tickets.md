---
description: Lista os issues abertos, prontos para ./ticket start.
allowed-tools: Bash(gh issue list:*)
---

## Issues abertos

!`gh issue list --state open`

Resuma a lista acima. Para implementar um issue, rode `./ticket start <numero>` onde
você estiver (na main, em detached HEAD ou numa worktree sua) — o `/start-ticket` cria
a branch `issue-<numero>` na pasta atual quando precisa. Se quiser isolar uma frente
(pra rodar várias em paralelo), crie uma worktree à mão e rode lá dentro
(ex.: `git worktree add ../sheetwise-issue-<numero> -b issue-<numero> origin/main`).
Se eu pedir, ajude a priorizar qual atacar primeiro.
