# Sheetwise

App de treino de **leitura na pauta** nas claves de **Sol**, **Fá** e **Dó**. Web-first
(React + Vite), visual minimalista (estilo Notion / iRealPro). Irmão do
[fretwise](https://github.com/diegonogueira/fretwise), que treina o braço do violão.

## Módulos

Cada módulo é uma tarefa numa configuração de claves, com URL própria e configurações
lembradas separadamente.

**Ler notas** (pauta → nome) — uma nota acende na pauta e você diz qual é. Por padrão a pauta
traz uma **armadura** e a nota vem limpa: quem diz que aquele Fá é Fá♯ é a armadura, então
você escolhe o acidente e a letra — que é a leitura de verdade.
**Marcar notas** (nome → pauta) — o enunciado pede uma nota e você clica na linha ou no
espaço certo; vale qualquer oitava da faixa desenhada.

Os dois existem em seis configurações de clave:

| Módulo | Claves | Como aparece |
|---|---|---|
| Clave de Sol | Sol | uma pauta |
| Clave de Fá | Fá | uma pauta |
| Clave de Dó | Dó 3ª e 4ª (configurável até a 1ª, 2ª e 5ª) | uma pauta, clave sorteada por questão |
| Piano | Sol + Fá | **sistema de duas pautas** com chave |
| Violoncelo | Fá + Dó 4ª | uma pauta, clave sorteada por questão |
| Viola | Dó 3ª + Sol | uma pauta, clave sorteada por questão |

O piano é **simultâneo** (as duas pautas na tela, como no repertório); violoncelo, viola e a
clave de Dó são **alternados** — a clave muda de uma questão para outra, que é como esses
instrumentos leem de verdade.

**Tonalidade** (armadura → tonalidade) — a armadura aparece na pauta e você nomeia a
tonalidade. Como uma armadura serve à tonalidade maior **e** à sua relativa menor, o
enunciado sempre diz qual das duas está pedindo.

## Configurações

Nomes das notas em **C D E** ou **Dó Ré Mi** (é configuração, não idioma), som ligado ou
desligado, e por módulo: quantas **linhas suplementares** entram na faixa (de 0 a 5 de cada
lado), de onde vêm os **acidentes** (nenhum · desenhados na nota · impostos pela armadura,
que é o padrão) e até quantos a armadura pode ter, e — em "Marcar notas" — se as posições da
pauta aparecem **rotuladas** como ajuda de leitura. A tonalidade tem ainda o modo perguntado
(maior/menor/os dois), o limite de acidentes e em quais claves a armadura é desenhada.

Interface em português e inglês.

## Scripts

```bash
npm install      # instala dependências
npm run dev      # servidor de desenvolvimento (http://localhost:5173)
npm run build    # type-check + build de produção (dist/)
npm run preview  # serve o build de produção
npm test         # testes do núcleo musical (Vitest)
```

### Android

O app roda no celular pelo Capacitor — o mesmo build web dentro de um WebView.

```bash
JAVA_HOME=/usr/lib/jvm/java-21-openjdk npm run android:apk  # gera o APK de debug
npm run android:install                                     # instala no aparelho via adb
./scripts/gen-icons.sh                                      # regenera os ícones do launcher
```

O Gradle 8.14 não aceita JDK 26, daí o `JAVA_HOME` apontando para o 21. O APK sai em
`android/app/build/outputs/apk/debug/app-debug.apk`.

## Stack

- **React 18 + TypeScript + Vite** — base web.
- **Tailwind CSS v4** — design tokens minimalistas (`src/index.css`), sem arquivo de config.
- **Zustand** — configurações persistidas em localStorage.
- **VexFlow** — desenha a pauta, as claves, as armaduras e as notas.
- **smplr** — áudio por soundfont (piano; carregado da CDN, então o som depende de rede).
- **i18next** — português e inglês.
- **Vitest** — testes do núcleo.

## Estrutura

```
src/
  core/          lógica musical pura, sem React, testada
    pitch.ts       nota escrita (letra + acidente + oitava) e o índice diatônico
    clef.ts        cada clave é o diatônico da sua linha inferior; geometria da pauta
    clefSet.ts     conjuntos de clave (Sol, Fá, Dó, piano, violoncelo, viola)
    keys.ts        as 15 armaduras, tônicas maior e menor, ordem dos acidentes
    module.ts      identidade dos módulos (tarefa × conjunto de claves)
    exercise.ts    gera as questões e valida as respostas
  components/
    Staff/         a pauta (VexFlow) + as posições clicáveis
    ExercisePanel  enunciado, resposta e feedback de cada tarefa
    NotePicker     as 7 letras, com o acidente da questão estampado
    Sidebar, TopBar, Settings, ui/Segmented
  hooks/         useExercise (sessão), useRoute (URL), useMediaQuery
  store/         configurações persistidas
  lib/           rotas e utilitários
  i18n/          pt/en
  audio/         player de soundfont
```

## Decisões de design

**A grafia é a lingua franca, não o MIDI.** Fá♯ e Sol♭ soam igual mas ocupam linhas
diferentes — distinguir as duas é o que se está aprendendo, então uma resposta enarmônica
nunca vale. O MIDI só existe na saída de áudio.

**A posição vertical é um número.** O índice diatônico (`oitava × 7 + grau`) é o que se
desenha e o que se clica; o acidente não move a nota. Isso deixa a geometria da pauta — e o
alvo de cada clique — em aritmética simples e testável sem navegador.

**Uma clave é a nota da sua linha de baixo.** Tudo o mais é consequência, então acrescentar
a clave de Dó na 1ª ou na 5ª linha custou um número.

## Próximos passos

Identidade visual (ícone e favicons), empacotamento Android via Capacitor, histórico de
progresso e o módulo inverso de tonalidade (dada a tonalidade, montar a armadura).
