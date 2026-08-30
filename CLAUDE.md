# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Sheetwise is a web-first (React + Vite) app for practicing **staff reading** — naming notes,
placing them on the staff, and identifying key signatures, in the treble, bass and C clefs.
See `README.md` for the product overview. This file covers the non-obvious architecture and
conventions. It is a sibling of **fretwise** (guitar-neck trainer) and shares its chassis:
URL routing, zustand settings store, Tailwind v4 `@theme` tokens, pure tested `src/core`.

## Commands

```bash
npm run dev          # dev server at http://localhost:5173
npm run build        # tsc --noEmit && vite build  (type-check is part of build)
npm test             # vitest run (core musical logic only)
npm run test:watch   # vitest watch

npx vitest run src/core/clef.test.ts    # single test file
npx vitest run -t "linha inferior"       # single test by name
```

`npm run build` fails on unused locals/parameters (strict TS with
`noUnusedLocals`/`noUnusedParameters`). Type errors are caught at build time, not by a
separate lint step — there is no ESLint config.

## Architecture

**`src/core/` is the single source of truth and is pure (no React).** The staff renderer,
the exercise engine and the audio all derive note identity from it. New training tools
should be built as new tasks on top of `src/core`, not by duplicating note logic.

### Spelling is the lingua franca (NOT MIDI)

This is the one thing that differs from fretwise, and getting it wrong breaks the whole app.
Fretwise uses the MIDI number everywhere because on a fretboard only pitch matters. On a
staff, **spelling** matters: F♯ and G♭ sound the same but sit on **different lines**, and
telling them apart is exactly what the student is learning.

So a note is a `Spelled` (`{ step: 0..6, alter: -1|0|1, octave }`), and its **vertical
position** on the staff is the **diatonic index** `octave * 7 + step` (C4 = 28, E4 = 30,
G2 = 18) — the accidental does not move a note vertically. See `src/core/pitch.ts`.

- The diatonic index is the analogue of fretwise's `Position`: it is what gets drawn and
  what gets clicked. Slot numbers in `Question.validSlots`, in `Mark.slot` and in the
  `data-slot` attribute of the click targets are all diatonic indices.
- **MIDI is output only.** `midiOf(spelled)` exists to feed the audio player. Never route
  an answer check through MIDI — `sameNote`/`checkNoteName` compare spelling, so an
  enharmonic is always wrong.

### A clef is just the diatonic of its bottom line

`src/core/clef.ts` defines each clef by one number: the diatonic index of the note on the
**lowest staff line** (treble = E4, bass = G2, alto = F3, tenor = D3…). Every other piece of
geometry is arithmetic from there: a line is 2 diatonics, a line→space step is 1.

`yForDiatonic` / `diatonicForY` are the drawing and hit-test functions. They take
`topLineY` and `spacing` as **parameters** rather than assuming VexFlow's defaults, and
`Staff.tsx` feeds them `stave.getYForLine(0)` and `stave.getSpacingBetweenLines()`. That is
why the click targets can never drift from the drawing, and why the whole geometry is unit
tested with no DOM. **Don't hardcode the 10px line spacing** — interactive staves are drawn
at 14px precisely so the touch targets aren't 5px tall.

### Modules are derived, not enumerated

`src/core/module.ts` builds the module list as `tarefa × conjunto-de-claves` with a template
literal type (`readNote:piano`, `markNote:bass`, plus the standalone `readKey`). Adding a
clef set in `clefSet.ts` creates both note modules automatically and makes TypeScript demand
the new entries wherever a `Record<Module, …>` is used. The menu (`Sidebar.tsx`) and the URLs
(`lib/routes.ts`) are derived the same way, so **there is no list of 13 things to keep in sync.**

`single` vs `grand` layout is a real musical distinction, not a rendering detail:
- `grand` (piano) draws **both** staves at once and the note lands on one of them.
- `single` (cello, viola, the C clef) draws **one** staff and **re-draws the clef per
  question** — that is how those instruments actually read, switching clef mid-piece.

### How each task validates

- **readNote** — octave-agnostic: the spelling (letter + accidental) must match, in any
  octave. The student names the note from all 7 letters (plus a ♭/♮/♯ selector when
  accidentals are on) — it is recall, not multiple choice, so there is no `choices` field.
- **markNote** — any drawn position spelling that note counts. `question.validSlots` is the
  **single source of truth**; on a wrong answer every valid slot is revealed as a `ghost`.
  The success message names **what the student clicked**, not the octave the generator
  happened to pick — they are both correct and citing the other one confuses.
- **readKey** — a key signature is **ambiguous** between the relative major and minor, so
  `question.keyAsk` always says which mode is being asked and every choice is that mode.
  Never "fix" this by accepting either answer.

## State is split in two

- **`useSettings`** (`src/store/settings.ts`, zustand + `persist`, key `sheetwise-settings`):
  what the user chose. Adding a top-level field is safe. Adding a `ModuleConfig` field is
  safe too — `useModuleConfig` backfills missing fields from `DEFAULT_MODULE_CONFIG` on
  **read**, so persisted states never need a migration for a new option. Renaming or
  removing a field **does** need a `version` bump plus a `migrate`.
- **`useExercise`** (`src/hooks/useExercise.ts`): the current question and answer. Per
  session, reset on every `next()` and on every module or config change. That reset happens
  **during render** (React's "adjust state when a prop changes"), never in an effect: an
  effect would leave one frame holding the previous module's question, and each task body
  reads fields only its own question has — `ReadKeyBody` hitting a note question's missing
  `keyChoices` blanked the screen until a reload.

Config objects passed to `useExercise` must be memoized in `App.tsx` (`useMemo`) — the hook
regenerates the question whenever a config **reference** changes.

Language lives outside the store, in `localStorage['sheetwise-lang']`.

## Note names are a setting, not a language

`naming: 'letters' | 'solfege'` decides between `C D E` and `Dó Ré Mi`. It is independent of
the UI language, and the labels come from `noteLabel`/`stepLabel` in `src/core/pitch.ts` —
**never from i18n**. i18n covers only UI chrome.

## UI placement rules

Modules are chosen in the Sidebar; **all configuration lives in the Settings modal**, with
sections gated by predicates (`isNoteModule`, `isMarkNote`, `usesCClef`, `module === 'readKey'`).
Don't add settings to the exercise panel.

## Styling

Tailwind v4 through the Vite plugin — there is no `tailwind.config.*`. Design tokens
(colors, radius) are `@theme` custom properties in `src/index.css`, exposed as utilities
like `text-ink`, `bg-accent-soft`, `border-line`. There is only a light theme.

The `.staff-slot` click targets live **inside the VexFlow SVG**, which sets a stroke on a
parent group — `stroke: none` in the CSS is load-bearing, not decoration. Same for
`.staff-hint`.

`.staff-ledger-preview` (the ledger lines that light up under the hovered slot) is shown by
`.staff-slot:hover + .staff-ledger-preview`, an **adjacent sibling** selector: the `<g>` must
be inserted immediately after its own `rect` in `Staff.tsx`. Putting anything between them —
the hint label, for instance — silently breaks the hover.

## The Staff component

`src/components/Staff/Staff.tsx` draws with VexFlow and then does two things by hand:

1. **Centers the notes.** The formatter left-aligns, which would glue the note to the clef.
   The shift is computed from the notes' bounding box (position **plus width**) and clamped
   to the note area, so a row of revealed ghosts never spills past the barline. The shift is
   applied to the **`TickContext`**, never with `setXShift`: a note's `x_shift` belongs to
   VexFlow, which uses it to open room for the accidental, and overwriting it moved only the
   notehead — the accidental reads the absolute X (from the tick context) and stayed parked
   next to the clef.
2. **Crops the canvas.** VexFlow is given a generous canvas, then the `viewBox` is narrowed
   to the vertical extent the module actually uses. That extent comes from the configured
   **range**, not from the drawn note, so the staff does not jump between questions.
   VexFlow writes the original height into an inline `style`, which beats the `height`
   attribute — `svgEl.style.height` must be set too or the content ends up letterboxed.
   The margin around that extent is measured in **staff spaces**, not pixels: a ♭ reaches
   about a space and a half above the notehead, so a fixed margin clipped the accidental of
   the highest note in the range.

## Verifying UI changes

There are no component/E2E tests — only `src/core/*.test.ts` and `src/lib/routes.test.ts`
(Vitest). To verify UI behavior, drive the dev server with a headless browser:
`playwright-core` (devDep) launching the system Chromium at `/usr/bin/chromium`, navigate to
`localhost:5173`, interact, screenshot. Stable selectors: `rect.staff-slot` (with
`data-slot` and `data-clef` attributes), `.staff`, `.staff-hint`.

## Not yet built

Branding (app icon, favicons, a `gen-brand.sh` like fretwise's), Capacitor/Android
packaging, progress statistics, and the reverse key-signature module (given a key, build the
signature). The original implementation plan is at
`~/.claude/plans/sleepy-roaming-starfish.md`.
