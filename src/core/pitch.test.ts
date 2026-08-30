import { describe, expect, it } from 'vitest'
import {
  ALTERS,
  LETTERS,
  STEPS,
  diatonic,
  midiOf,
  noteLabel,
  sameNote,
  spelledAt,
  stepLabel,
  toVexKey,
  type Spelled,
} from './pitch'

const C4: Spelled = { step: 0, alter: 0, octave: 4 }

describe('diatônico', () => {
  it('ancora o dó central em 28', () => {
    expect(diatonic(C4)).toBe(28)
    expect(diatonic({ step: 2, alter: 0, octave: 4 })).toBe(30) // Mi4
    expect(diatonic({ step: 4, alter: 0, octave: 2 })).toBe(18) // Sol2
  })

  it('ignora o acidente — a posição vertical é a mesma', () => {
    expect(diatonic({ step: 3, alter: 1, octave: 3 })).toBe(diatonic({ step: 3, alter: -1, octave: 3 }))
  })

  it('fecha a volta com spelledAt em toda a extensão útil', () => {
    for (let d = 0; d < 70; d++) {
      for (const alter of ALTERS) {
        expect(diatonic(spelledAt(d, alter))).toBe(d)
        expect(spelledAt(d, alter).alter).toBe(alter)
      }
    }
  })
})

describe('midiOf', () => {
  it('põe o dó central em 60', () => {
    expect(midiOf(C4)).toBe(60)
    expect(midiOf({ step: 5, alter: 0, octave: 4 })).toBe(69) // Lá4 = 440 Hz
  })

  it('dá o mesmo MIDI para enarmônicas, com diatônicos diferentes', () => {
    const fSharp: Spelled = { step: 3, alter: 1, octave: 4 }
    const gFlat: Spelled = { step: 4, alter: -1, octave: 4 }
    expect(midiOf(fSharp)).toBe(midiOf(gFlat))
    expect(diatonic(fSharp)).not.toBe(diatonic(gFlat))
  })

  it('sobe 12 a cada oitava', () => {
    for (const step of STEPS) {
      const low = { step, alter: 0 as const, octave: 3 }
      const high = { step, alter: 0 as const, octave: 4 }
      expect(midiOf(high) - midiOf(low)).toBe(12)
    }
  })
})

describe('rótulos', () => {
  it('usa letras ou solfejo conforme a nomenclatura', () => {
    expect(stepLabel(3, 'letters')).toBe('F')
    expect(stepLabel(3, 'solfege')).toBe('Fá')
    expect(noteLabel({ step: 3, alter: 1, octave: 4 }, 'letters')).toBe('F♯')
    expect(noteLabel({ step: 3, alter: 1, octave: 4 }, 'solfege')).toBe('Fá♯')
    expect(noteLabel({ step: 6, alter: -1, octave: 3 }, 'letters', true)).toBe('B♭3')
  })

  it('não põe símbolo em nota natural', () => {
    expect(noteLabel(C4, 'letters')).toBe('C')
  })
})

describe('toVexKey', () => {
  it('monta a chave no formato do VexFlow', () => {
    expect(toVexKey(C4)).toEqual({ key: 'c/4', accidental: null })
    expect(toVexKey({ step: 3, alter: 1, octave: 4 })).toEqual({ key: 'f#/4', accidental: '#' })
    expect(toVexKey({ step: 6, alter: -1, octave: 3 })).toEqual({ key: 'bb/3', accidental: 'b' })
  })

  it('usa a letra internacional de cada grau', () => {
    for (const step of STEPS) {
      expect(toVexKey({ step, alter: 0, octave: 4 }).key[0]).toBe(LETTERS[step].toLowerCase())
    }
  })
})

describe('sameNote', () => {
  it('compara a grafia, não a altura', () => {
    const fSharp: Spelled = { step: 3, alter: 1, octave: 4 }
    const gFlat: Spelled = { step: 4, alter: -1, octave: 4 }
    expect(sameNote(fSharp, gFlat)).toBe(false)
  })

  it('ignora a oitava por padrão e cobra quando pedido', () => {
    const a: Spelled = { step: 0, alter: 0, octave: 3 }
    const b: Spelled = { step: 0, alter: 0, octave: 5 }
    expect(sameNote(a, b)).toBe(true)
    expect(sameNote(a, b, true)).toBe(false)
  })
})
