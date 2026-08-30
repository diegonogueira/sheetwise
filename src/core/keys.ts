// Armaduras de clave (tonalidades).
//
// `fifths` é a posição no ciclo das quintas: negativo = bemóis, positivo = sustenidos.
// Uma armadura sozinha é AMBÍGUA — 1 sustenido é Sol maior E Mi menor. Por isso o
// exercício sempre diz qual modo está perguntando (ver `keyAsk` em exercise.ts).

import { type Alter, type Naming, type Spelled, type Step, noteLabel } from './pitch'

export type KeyMode = 'major' | 'minor'

export interface KeySignature {
  /** −7 (7 bemóis) a +7 (7 sustenidos); 0 = Dó maior / Lá menor */
  fifths: number
  /** tônica maior (a oitava não importa aqui — é só a grafia do nome) */
  major: { step: Step; alter: Alter }
  /** tônica da relativa menor */
  minor: { step: Step; alter: Alter }
}

/** Ordem em que os sustenidos entram na armadura: Fá Dó Sol Ré Lá Mi Si. */
export const SHARP_ORDER: Step[] = [3, 0, 4, 1, 5, 2, 6]
/** Ordem dos bemóis — o inverso exato: Si Mi Lá Ré Sol Dó Fá. */
export const FLAT_ORDER: Step[] = [...SHARP_ORDER].reverse()

/** As 15 armaduras, do 7 bemóis ao 7 sustenidos. */
export const KEY_SIGNATURES: KeySignature[] = [
  { fifths: -7, major: { step: 0, alter: -1 }, minor: { step: 5, alter: -1 } }, // Cb / Ab
  { fifths: -6, major: { step: 4, alter: -1 }, minor: { step: 2, alter: -1 } }, // Gb / Eb
  { fifths: -5, major: { step: 1, alter: -1 }, minor: { step: 6, alter: -1 } }, // Db / Bb
  { fifths: -4, major: { step: 5, alter: -1 }, minor: { step: 3, alter: 0 } },  // Ab / F
  { fifths: -3, major: { step: 2, alter: -1 }, minor: { step: 0, alter: 0 } },  // Eb / C
  { fifths: -2, major: { step: 6, alter: -1 }, minor: { step: 4, alter: 0 } },  // Bb / G
  { fifths: -1, major: { step: 3, alter: 0 }, minor: { step: 1, alter: 0 } },   // F  / D
  { fifths: 0, major: { step: 0, alter: 0 }, minor: { step: 5, alter: 0 } },    // C  / A
  { fifths: 1, major: { step: 4, alter: 0 }, minor: { step: 2, alter: 0 } },    // G  / E
  { fifths: 2, major: { step: 1, alter: 0 }, minor: { step: 6, alter: 0 } },    // D  / B
  { fifths: 3, major: { step: 5, alter: 0 }, minor: { step: 3, alter: 1 } },    // A  / F#
  { fifths: 4, major: { step: 2, alter: 0 }, minor: { step: 0, alter: 1 } },    // E  / C#
  { fifths: 5, major: { step: 6, alter: 0 }, minor: { step: 4, alter: 1 } },    // B  / G#
  { fifths: 6, major: { step: 3, alter: 1 }, minor: { step: 1, alter: 1 } },    // F# / D#
  { fifths: 7, major: { step: 0, alter: 1 }, minor: { step: 5, alter: 1 } },    // C# / A#
]

export function signatureByFifths(fifths: number): KeySignature {
  const sig = KEY_SIGNATURES.find((k) => k.fifths === fifths)
  if (!sig) throw new Error(`armadura inexistente: ${fifths}`)
  return sig
}

/** Armaduras com no máximo `max` acidentes (a config limita a dificuldade). */
export function signaturesUpTo(max: number): KeySignature[] {
  return KEY_SIGNATURES.filter((k) => Math.abs(k.fifths) <= max)
}

/** Tônica da armadura no modo pedido, como nota grafada (oitava 4, só p/ reaproveitar `noteLabel`). */
export function tonic(sig: KeySignature, mode: KeyMode): Spelled {
  const t = mode === 'major' ? sig.major : sig.minor
  return { step: t.step, alter: t.alter, octave: 4 }
}

/** Nome da tonalidade sem o "maior/menor" — quem escreve isso é a i18n. */
export function keyTonicLabel(sig: KeySignature, mode: KeyMode, naming: Naming): string {
  return noteLabel(tonic(sig, mode), naming)
}

/** Nome da armadura no VexFlow (`stave.addKeySignature`): sempre a tônica MAIOR. */
export function toVexKeySignature(sig: KeySignature): string {
  const t = sig.major
  const letter = ['C', 'D', 'E', 'F', 'G', 'A', 'B'][t.step]
  return letter + (t.alter === 1 ? '#' : t.alter === -1 ? 'b' : '')
}

/**
 * Os graus que recebem acidente, na ordem em que aparecem na armadura. O VexFlow desenha
 * a armadura sozinho; isto existe para os testes e para o texto de revelação.
 */
export function signatureSteps(sig: KeySignature): Step[] {
  const order = sig.fifths >= 0 ? SHARP_ORDER : FLAT_ORDER
  return order.slice(0, Math.abs(sig.fifths))
}
