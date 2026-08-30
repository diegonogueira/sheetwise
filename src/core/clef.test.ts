import { describe, expect, it } from 'vitest'
import {
  CLEF,
  CLEF_IDS,
  LEDGER_COUNTS,
  diatonicForY,
  slotsInRange,
  staffRange,
  topLine,
  yForDiatonic,
} from './clef'
import { noteLabel, spelledAt } from './pitch'

describe('linha inferior de cada clave', () => {
  // a nota da linha de baixo é o que define a clave inteira — se isto quebra, tudo desalinha
  const expected: Record<string, string> = {
    treble: 'E4',
    bass: 'G2',
    alto: 'F3',
    tenor: 'D3',
    soprano: 'C4',
    mezzo: 'A3',
    baritone: 'B2',
  }

  for (const id of CLEF_IDS) {
    it(`${id} começa em ${expected[id]}`, () => {
      expect(noteLabel(spelledAt(CLEF[id].bottomLine), 'letters', true)).toBe(expected[id])
    })
  }

  it('põe o dó central no meio da clave de Dó 3ª (alto)', () => {
    const middle = CLEF.alto.bottomLine + 4
    expect(noteLabel(spelledAt(middle), 'letters', true)).toBe('C4')
  })

  it('põe o Sol4 na 2ª linha da clave de Sol', () => {
    expect(noteLabel(spelledAt(CLEF.treble.bottomLine + 2), 'letters', true)).toBe('G4')
  })

  it('põe o Fá3 na 4ª linha da clave de Fá', () => {
    expect(noteLabel(spelledAt(CLEF.bass.bottomLine + 6), 'letters', true)).toBe('F3')
  })
})

describe('staffRange', () => {
  it('sem linhas suplementares vai do espaço abaixo ao espaço acima', () => {
    const r = staffRange(CLEF.treble, 0, 0)
    expect(noteLabel(spelledAt(r.lo), 'letters', true)).toBe('D4')
    expect(noteLabel(spelledAt(r.hi), 'letters', true)).toBe('G5')
  })

  it('cada linha suplementar estende 2 diatônicos do seu lado', () => {
    const base = staffRange(CLEF.treble, 0, 0)
    const wide = staffRange(CLEF.treble, 2, 2)
    expect(base.lo - wide.lo).toBe(4)
    expect(wide.hi - base.hi).toBe(4)
  })

  it('estende só o lado pedido', () => {
    const base = staffRange(CLEF.bass, 0, 0)
    const below = staffRange(CLEF.bass, 2, 0)
    expect(below.lo).toBe(base.lo - 4)
    expect(below.hi).toBe(base.hi)
  })

  it('a faixa nunca fica vazia e cresce com as linhas', () => {
    for (const id of CLEF_IDS) {
      for (const n of LEDGER_COUNTS) {
        const slots = slotsInRange(staffRange(CLEF[id], n, n))
        expect(slots.length).toBe(11 + 4 * n)
      }
    }
  })
})

describe('geometria (desenho e hit-test)', () => {
  const spacing = 10
  const topY = 40

  it('põe a linha de cima no topo e a de baixo 4 espaços abaixo', () => {
    const clef = CLEF.treble
    expect(yForDiatonic(topLine(clef), clef, topY, spacing)).toBe(topY)
    expect(yForDiatonic(clef.bottomLine, clef, topY, spacing)).toBe(topY + 4 * spacing)
  })

  it('desce meio espaço a cada diatônico (nota mais aguda = Y menor)', () => {
    const clef = CLEF.bass
    const a = yForDiatonic(30, clef, topY, spacing)
    const b = yForDiatonic(31, clef, topY, spacing)
    expect(a - b).toBe(spacing / 2)
  })

  it('diatonicForY é o inverso exato de yForDiatonic', () => {
    for (const id of CLEF_IDS) {
      const clef = CLEF[id]
      for (const d of slotsInRange(staffRange(clef, 2, 2))) {
        const y = yForDiatonic(d, clef, topY, spacing)
        expect(diatonicForY(y, clef, topY, spacing)).toBe(d)
      }
    }
  })

  it('arredonda um clique fora do centro para a posição mais próxima', () => {
    const clef = CLEF.treble
    const d = 30
    const y = yForDiatonic(d, clef, topY, spacing)
    // um quarto de espaço para cada lado ainda cai na mesma posição
    expect(diatonicForY(y + spacing / 4 - 0.5, clef, topY, spacing)).toBe(d)
    expect(diatonicForY(y - spacing / 4 + 0.5, clef, topY, spacing)).toBe(d)
    // meio espaço já é a posição vizinha
    expect(diatonicForY(y + spacing / 2, clef, topY, spacing)).toBe(d - 1)
  })
})
