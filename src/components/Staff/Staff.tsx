import { useLayoutEffect, useRef } from 'react'
import { Accidental, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice } from 'vexflow'
import {
  CLEF,
  ledgerLinesFor,
  slotsInRange,
  staffRange,
  yForDiatonic,
  type ClefId,
  type LedgerCount,
} from '../../core/clef'
import { spelledAt, stepLabel, toVexKey, type Alter, type Naming } from '../../core/pitch'
import { toVexKeySignature, type KeySignature } from '../../core/keys'

/** Uma nota desenhada na pauta, com o papel dela no exercício. */
export type MarkVariant = 'accent' | 'selected' | 'correct' | 'wrong' | 'ghost'

export interface Mark {
  /** posição vertical (índice diatônico) */
  slot: number
  alter: Alter
  variant: MarkVariant
  /** clave/pauta em que desenhar; sem isso vai na primeira que cobrir a posição */
  clef?: ClefId
}

const VARIANT_COLOR: Record<MarkVariant, string> = {
  accent: 'var(--color-accent)',
  selected: 'var(--color-accent)',
  correct: 'var(--color-correct)',
  wrong: 'var(--color-wrong)',
  ghost: 'var(--color-faint)',
}

/** Espaçamento entre linhas. O padrão do VexFlow é 10; nas pautas em que se CLICA a pauta é
 *  desenhada maior, senão cada posição vira um alvo de 5px — inclicável no celular. Toda a
 *  geometria lê o espaçamento do próprio `Stave`, então basta mudar aqui. */
const SPACING = 10
const SPACING_INTERACTIVE = 14
const STAVE_GAP = 80 // distância entre as duas pautas do sistema de piano
/** Folga à esquerda. O sistema de piano precisa de mais: a chave é desenhada FORA da pauta. */
const PAD_X = 10
const PAD_X_GRAND = 26
/**
 * Coluna reservada à esquerda para as letras de ajuda. As posições ficam a meio espaço
 * (5px) umas das outras — perto demais para empilhar texto —, então as letras alternam
 * entre duas colunas, o que dá um espaço inteiro de folga vertical a cada uma.
 */
const HINT_GUTTER = 24
const HINT_COLUMN = 11
/** Y em que o VexFlow põe a 1ª linha de uma pauta criada em y=0 (folga p/ texto acima). */
const STAVE_TOP_OFFSET = 40
/** Quanto a clave passa da pauta (a de Sol é o glifo mais alto) — entra no enquadramento. */
const CLEF_OVERHANG = 20
/**
 * Folga acima/abaixo da nota mais extrema, em espaços de pauta. Não é a cabeça que manda:
 * o ♭ sobe cerca de um espaço e meio acima dela, então uma folga fixa em pixels cortaria o
 * acidente da nota mais aguda da faixa.
 */
const NOTE_MARGIN_SPACES = 2
const noteMargin = (spacing: number) => NOTE_MARGIN_SPACES * spacing
/** Largura da linha suplementar de pré-visualização, em espaços de pauta (a do VexFlow
 *  passa um pouco de cada lado da cabeça da nota). */
const LEDGER_PREVIEW_SPACES = 2.4

interface StaffProps {
  /** claves desenhadas, do grave ao agudo (uma só, ou as duas do sistema de piano) */
  staves: ClefId[]
  ledgerBelow: LedgerCount
  ledgerAbove: LedgerCount
  /** armadura desenhada em todas as pautas (módulo de tonalidade) */
  keySig?: KeySignature
  marks?: Mark[]
  /** liga as posições clicáveis; recebe o índice diatônico e a clave da pauta clicada */
  onSelect?: (slot: number, clef: ClefId) => void
  /** escreve a letra de cada posição clicável (ajuda de leitura) */
  hints?: Naming | null
  width?: number
}

/**
 * Altura da tela de desenho. É deliberadamente folgada: o VexFlow precisa de espaço para
 * desenhar, e o `viewBox` no fim recorta o resultado na altura real (ver `useLayoutEffect`).
 */
function canvasHeight(
  staves: ClefId[],
  ledgerBelow: LedgerCount,
  ledgerAbove: LedgerCount,
  spacing: number,
): number {
  const body = 4 * spacing
  const ledger = (ledgerBelow + ledgerAbove) * spacing + 2 * CLEF_OVERHANG
  const gaps = (staves.length - 1) * STAVE_GAP
  return STAVE_TOP_OFFSET + staves.length * body + gaps + ledger + 2 * noteMargin(spacing)
}

/**
 * A pauta: desenha com VexFlow e, quando `onSelect` é dado, sobrepõe um alvo de clique por
 * posição diatônica.
 *
 * As coordenadas dos alvos NÃO são estimadas: saem de `yForDiatonic` (núcleo, testado)
 * alimentado com o Y e o espaçamento que o próprio VexFlow reporta (`getYForLine` /
 * `getSpacingBetweenLines`). Assim o desenho e o hit-test nunca divergem, mesmo que o
 * VexFlow mude o espaçamento padrão.
 */
export function Staff({
  staves,
  ledgerBelow,
  ledgerAbove,
  keySig,
  marks = [],
  onSelect,
  hints = null,
  width = 320,
}: StaffProps) {
  const ref = useRef<HTMLDivElement>(null)
  // guarda o callback num ref: mudar o handler não deve forçar um redesenho do VexFlow
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  // assinatura estável: só redesenha quando o CONTEÚDO muda, não a identidade dos arrays
  const sig = [
    staves.join(','),
    ledgerBelow,
    ledgerAbove,
    keySig?.fifths ?? 'none',
    marks.map((m) => `${m.slot}:${m.alter}:${m.variant}:${m.clef ?? ''}`).join('|'),
    onSelect ? 'live' : 'static',
    hints ?? 'nohints',
    width,
  ].join('#')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''

    // pedido ao VexFlow; a geometria abaixo relê o valor efetivo de cada `Stave`
    const requestedSpacing = selectRef.current ? SPACING_INTERACTIVE : SPACING
    const height = canvasHeight(staves, ledgerBelow, ledgerAbove, requestedSpacing)
    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(width, height)
    const ctx = renderer.getContext()

    // as pautas vêm do grave ao agudo, mas na tela a aguda fica em cima
    const drawn = [...staves].reverse()
    const padX = (staves.length > 1 ? PAD_X_GRAND : PAD_X) + (hints ? HINT_GUTTER : 0)
    const staveWidth = width - padX - PAD_X
    const built = drawn.map((clefId, i) => {
      const stave = new Stave(padX, i * (4 * requestedSpacing + STAVE_GAP), staveWidth, {
        spacing_between_lines_px: requestedSpacing,
      })
      stave.addClef(CLEF[clefId].vex)
      if (keySig) stave.addKeySignature(toVexKeySignature(keySig))
      stave.setContext(ctx).draw()
      return { clefId, stave }
    })

    // sistema de piano: chave + linha ligando as duas pautas
    if (built.length === 2) {
      const [top, bottom] = built
      for (const type of [StaveConnector.type.BRACE, StaveConnector.type.SINGLE_LEFT]) {
        new StaveConnector(top.stave, bottom.stave).setType(type).setContext(ctx).draw()
      }
    }

    // onde a nota cai: na pauta pedida, ou na primeira que cobre a posição
    const staveFor = (mark: Mark) => {
      if (mark.clef) return built.find((b) => b.clefId === mark.clef) ?? built[0]
      const range = (b: (typeof built)[number]) =>
        staffRange(CLEF[b.clefId], ledgerBelow, ledgerAbove)
      return built.find((b) => mark.slot >= range(b).lo && mark.slot <= range(b).hi) ?? built[0]
    }

    // Todas as marcas de uma mesma pauta são formatadas JUNTAS: assim o VexFlow as espaça
    // na horizontal em vez de empilhá-las no mesmo x (o caso de revelar várias posições
    // válidas como fantasmas depois de um erro). Depois de formatar, o conjunto é deslocado
    // para o centro da pauta — o formatter alinha à esquerda, o que deixaria a nota colada
    // na clave, com um vazio enorme à direita.
    for (const target of built) {
      const { clefId, stave } = target
      const mine = marks.filter((m) => staveFor(m) === target)
      if (!mine.length) continue
      const notes = mine.map((mark) => {
        const { key, accidental } = toVexKey(spelledAt(mark.slot, mark.alter))
        const note = new StaveNote({ keys: [key], duration: 'w', clef: CLEF[clefId].vex })
        if (accidental) note.addModifier(new Accidental(accidental), 0)
        const color = VARIANT_COLOR[mark.variant]
        note.setStyle({ fillStyle: color, strokeStyle: color })
        return note
      })

      const voice = new Voice({ num_beats: notes.length, beat_value: 1 })
        .setMode(Voice.Mode.SOFT)
        .addTickables(notes)
      const areaStart = stave.getNoteStartX()
      const areaWidth = stave.getNoteEndX() - areaStart
      new Formatter().joinVoices([voice]).format([voice], areaWidth)

      // centraliza pela CAIXA das notas (posição + largura), senão a última encosta ou
      // vaza a borda direita da pauta; o clamp garante que nada saia da área útil
      const lefts = notes.map((n) => n.getAbsoluteX())
      const contentL = Math.min(...lefts)
      const contentR = Math.max(...notes.map((n, i) => lefts[i] + n.getWidth()))
      const flushLeft = areaStart - contentL
      const flushRight = areaStart + areaWidth - contentR
      const centered = flushLeft + (flushRight - flushLeft) / 2
      const shift = flushRight < flushLeft ? flushLeft : Math.min(Math.max(centered, flushLeft), flushRight)
      // O deslocamento vai no TickContext, NÃO em `setXShift`: o `x_shift` da nota é do
      // próprio VexFlow, que o usa para abrir espaço ao acidente. Sobrescrevê-lo movia só a
      // cabeça — o acidente se posiciona pelo X absoluto (que vem do TickContext) e ficava
      // largado ao lado da clave, longe da nota que ele altera.
      for (const tc of new Set(notes.map((n) => n.getTickContext()))) tc.setX(tc.getX() + shift)

      voice.draw(ctx, stave)
    }

    // Enquadramento vertical: recorta a tela folgada na altura que o módulo REALMENTE usa.
    // A extensão vem da FAIXA configurada (não da nota sorteada), então a pauta não pula de
    // posição entre uma questão e outra; a clave entra via `CLEF_OVERHANG`, porque a de Sol
    // passa bastante das linhas.
    const svg = el.querySelector('svg')
    if (svg) {
      let top = Infinity
      let bottom = -Infinity
      for (const { clefId, stave } of built) {
        const clef = CLEF[clefId]
        const topLineY = stave.getYForLine(0)
        const spacing = stave.getSpacingBetweenLines()
        const range = staffRange(clef, ledgerBelow, ledgerAbove)
        const margin = noteMargin(spacing)
        top = Math.min(top, yForDiatonic(range.hi, clef, topLineY, spacing) - margin, topLineY - CLEF_OVERHANG)
        bottom = Math.max(
          bottom,
          yForDiatonic(range.lo, clef, topLineY, spacing) + margin,
          topLineY + 4 * spacing + CLEF_OVERHANG,
        )
      }
      const viewHeight = bottom - top
      svg.setAttribute('viewBox', `0 ${top} ${width} ${viewHeight}`)
      svg.setAttribute('height', String(viewHeight))
      // o VexFlow escreve a altura original num style inline, que vence o atributo — sem
      // sobrescrevê-lo o conteúdo recortado ficaria "letterboxed" dentro da tela folgada
      svg.style.height = `${viewHeight}px`
    }

    // alvos de clique: um por posição diatônica de cada pauta
    if (selectRef.current && svg) {
      {
        const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        for (const { clefId, stave } of built) {
          const clef = CLEF[clefId]
          const topLineY = stave.getYForLine(0)
          const spacing = stave.getSpacingBetweenLines()
          const x = stave.getNoteStartX()
          const w = stave.getNoteEndX() - x
          for (const slot of slotsInRange(staffRange(clef, ledgerBelow, ledgerAbove))) {
            const y = yForDiatonic(slot, clef, topLineY, spacing)
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            rect.setAttribute('class', 'staff-slot')
            rect.setAttribute('x', String(x))
            rect.setAttribute('y', String(y - spacing / 4))
            rect.setAttribute('width', String(w))
            rect.setAttribute('height', String(spacing / 2))
            rect.setAttribute('data-slot', String(slot))
            rect.setAttribute('data-clef', clefId)
            layer.appendChild(rect)

            // Pré-visualização das linhas suplementares. Fora da pauta o realce sozinho é
            // uma barra no vazio: não dá para saber se aquilo é linha ou espaço, nem a que
            // distância da pauta está. Desenhar as suplementares do caminho (como a partitura
            // faria com a nota escrita ali) devolve a referência. Vem logo DEPOIS do alvo
            // porque o CSS a acende com `.staff-slot:hover + .staff-ledger-preview`.
            const ledgers = ledgerLinesFor(slot, clef)
            if (ledgers.length) {
              const preview = document.createElementNS('http://www.w3.org/2000/svg', 'g')
              preview.setAttribute('class', 'staff-ledger-preview')
              const half = (LEDGER_PREVIEW_SPACES * spacing) / 2
              const cx = x + w / 2
              for (const d of ledgers) {
                const ly = yForDiatonic(d, clef, topLineY, spacing)
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
                line.setAttribute('x1', String(cx - half))
                line.setAttribute('x2', String(cx + half))
                line.setAttribute('y1', String(ly))
                line.setAttribute('y2', String(ly))
                // a linha da posição apontada vem realçada: é o que diz "aqui é LINHA",
                // e não o espaço logo acima ou abaixo dela
                if (d === slot) line.setAttribute('class', 'is-slot')
                preview.appendChild(line)
              }
              layer.appendChild(preview)
            }

            if (hints) {
              // a letra vai na coluna reservada à ESQUERDA da pauta (`HINT_GUTTER`): dentro
              // dela cairia sobre a clave e sobre as próprias notas
              const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
              const column = (((slot % 2) + 2) % 2) * HINT_COLUMN
              label.setAttribute('x', String(stave.getX() - 4 - column))
              label.setAttribute('y', String(y + 3))
              label.setAttribute('text-anchor', 'end')
              label.setAttribute('class', 'staff-hint')
              label.textContent = stepLabel(spelledAt(slot).step, hints)
              layer.appendChild(label)
            }
          }
        }
        layer.addEventListener('click', (ev) => {
          const el = ev.target as SVGElement
          const slot = el.getAttribute?.('data-slot')
          const clef = el.getAttribute?.('data-clef')
          if (slot != null && clef != null) selectRef.current?.(Number(slot), clef as ClefId)
        })
        svg.appendChild(layer)
      }
    }

    return () => {
      el.innerHTML = ''
    }
  }, [sig])

  return <div ref={ref} className="staff" aria-label="Pauta" />
}
