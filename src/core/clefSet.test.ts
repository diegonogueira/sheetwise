import { describe, expect, it } from 'vitest'
import {
  C_CLEF_BY_LINE,
  C_CLEF_LINES,
  CLEF_SET,
  CLEF_SET_IDS,
  DEFAULT_C_CLEF_LINES,
  clefsForSet,
} from './clefSet'
import { CLEF } from './clef'

describe('conjuntos de clave', () => {
  it('todo conjunto tem ao menos uma clave válida', () => {
    for (const id of CLEF_SET_IDS) {
      const set = CLEF_SET[id]
      expect(set.clefs.length).toBeGreaterThan(0)
      for (const c of set.clefs) expect(CLEF[c]).toBeDefined()
    }
  })

  it('só o piano é sistema de duas pautas', () => {
    const grand = CLEF_SET_IDS.filter((id) => CLEF_SET[id].layout === 'grand')
    expect(grand).toEqual(['piano'])
    expect(CLEF_SET.piano.clefs).toEqual(['bass', 'treble'])
  })

  it('os conjuntos mistos usam as combinações reais dos instrumentos', () => {
    expect(CLEF_SET.cello.clefs).toEqual(['bass', 'tenor'])
    expect(CLEF_SET.viola.clefs).toEqual(['alto', 'treble'])
  })
})

describe('clefsForSet', () => {
  it('só a clave de Dó depende da config', () => {
    for (const id of CLEF_SET_IDS) {
      if (id === 'c') continue
      expect(clefsForSet(CLEF_SET[id], ['1'])).toEqual(CLEF_SET[id].clefs)
    }
  })

  it('mapeia cada linha para a clave de Dó certa', () => {
    expect(clefsForSet(CLEF_SET.c, ['3'])).toEqual(['alto'])
    expect(clefsForSet(CLEF_SET.c, ['4'])).toEqual(['tenor'])
    expect(clefsForSet(CLEF_SET.c, C_CLEF_LINES)).toEqual(
      C_CLEF_LINES.map((l) => C_CLEF_BY_LINE[l]),
    )
  })

  it('cai no padrão quando nenhuma linha está marcada', () => {
    expect(clefsForSet(CLEF_SET.c, [])).toEqual(DEFAULT_C_CLEF_LINES.map((l) => C_CLEF_BY_LINE[l]))
  })

  it('põe o dó central na linha que o nome da clave indica', () => {
    // clave de Dó na 3ª linha: 2 linhas (4 diatônicos) acima da inferior
    for (const [line, clef] of Object.entries(C_CLEF_BY_LINE)) {
      const offset = (Number(line) - 1) * 2
      expect(CLEF[clef].bottomLine + offset).toBe(28) // 28 = dó central
    }
  })
})
