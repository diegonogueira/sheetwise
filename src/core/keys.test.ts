import { describe, expect, it } from 'vitest'
import {
  FLAT_ORDER,
  KEY_SIGNATURES,
  SHARP_ORDER,
  keyTonicLabel,
  signatureByFifths,
  signatureSteps,
  signaturesUpTo,
  toVexKeySignature,
  tonic,
} from './keys'
import { midiOf } from './pitch'

describe('catálogo de armaduras', () => {
  it('tem as 15, de 7 bemóis a 7 sustenidos, sem buracos', () => {
    expect(KEY_SIGNATURES).toHaveLength(15)
    expect(KEY_SIGNATURES.map((k) => k.fifths)).toEqual(
      Array.from({ length: 15 }, (_, i) => i - 7),
    )
  })

  it('nomeia as tonalidades maiores do ciclo das quintas', () => {
    const names = KEY_SIGNATURES.map((k) => keyTonicLabel(k, 'major', 'letters'))
    expect(names).toEqual(['C♭', 'G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'])
  })

  it('nomeia as relativas menores', () => {
    const names = KEY_SIGNATURES.map((k) => keyTonicLabel(k, 'minor', 'letters'))
    expect(names).toEqual(['A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯', 'A♯'])
  })

  it('põe a relativa menor uma terça menor abaixo da maior', () => {
    for (const sig of KEY_SIGNATURES) {
      const maj = midiOf(tonic(sig, 'major'))
      const min = midiOf(tonic(sig, 'minor'))
      // mesma oitava nominal nos dois: a distância é 3 semitons abaixo, ou 9 acima
      expect(((maj - min) % 12 + 12) % 12).toBe(3)
    }
  })

  it('usa o solfejo quando pedido', () => {
    expect(keyTonicLabel(signatureByFifths(2), 'major', 'solfege')).toBe('Ré')
    expect(keyTonicLabel(signatureByFifths(-1), 'major', 'solfege')).toBe('Fá')
  })
})

describe('ordem dos acidentes', () => {
  it('sustenidos entram em Fá Dó Sol Ré Lá Mi Si', () => {
    expect(SHARP_ORDER).toEqual([3, 0, 4, 1, 5, 2, 6])
  })

  it('bemóis entram na ordem inversa', () => {
    expect(FLAT_ORDER).toEqual([...SHARP_ORDER].reverse())
  })

  it('a armadura tem tantos acidentes quanto o valor de fifths', () => {
    for (const sig of KEY_SIGNATURES) {
      const steps = signatureSteps(sig)
      expect(steps).toHaveLength(Math.abs(sig.fifths))
      expect(new Set(steps).size).toBe(steps.length)
    }
  })

  it('cada armadura estende a anterior (o acidente novo entra no fim)', () => {
    for (let f = 1; f <= 7; f++) {
      const prev = signatureSteps(signatureByFifths(f - 1))
      expect(signatureSteps(signatureByFifths(f)).slice(0, f - 1)).toEqual(prev)
    }
    for (let f = -1; f >= -7; f--) {
      const prev = signatureSteps(signatureByFifths(f + 1))
      expect(signatureSteps(signatureByFifths(f)).slice(0, Math.abs(f) - 1)).toEqual(prev)
    }
  })
})

describe('signaturesUpTo', () => {
  it('limita a dificuldade pelos dois lados', () => {
    expect(signaturesUpTo(0).map((s) => s.fifths)).toEqual([0])
    expect(signaturesUpTo(4).map((s) => s.fifths)).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4])
    expect(signaturesUpTo(7)).toHaveLength(15)
  })
})

describe('toVexKeySignature', () => {
  it('devolve sempre a tônica maior, no formato do VexFlow', () => {
    expect(toVexKeySignature(signatureByFifths(0))).toBe('C')
    expect(toVexKeySignature(signatureByFifths(2))).toBe('D')
    expect(toVexKeySignature(signatureByFifths(-2))).toBe('Bb')
    expect(toVexKeySignature(signatureByFifths(7))).toBe('C#')
    expect(toVexKeySignature(signatureByFifths(-7))).toBe('Cb')
  })
})
