// Núcleo musical: a identidade de uma nota ESCRITA.
//
// O fretwise usa o número MIDI como lingua franca porque no braço só importa a altura.
// Na pauta importa a GRAFIA: Fá♯ e Sol♭ soam igual (mesmo MIDI) mas ocupam LINHAS
// DIFERENTES. Por isso aqui a lingua franca é o par:
//
//   `Spelled`  = { step, alter, octave }  → a identidade escrita (letra + acidente)
//   diatônico  = octave * 7 + step        → a POSIÇÃO VERTICAL na pauta, sem o acidente
//
// O diatônico é o análogo do `Position` do fretwise: é o que se desenha e o que se clica.
// O MIDI continua existindo, mas só como SAÍDA (áudio) — ver `midiOf`.

/** Grau da escala natural: 0 = C, 1 = D, ... 6 = B. */
export type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Acidente simples: bemol, natural ou sustenido (dobrados ficam fora do v1). */
export type Alter = -1 | 0 | 1

/** Uma nota como ela aparece no papel. */
export interface Spelled {
  step: Step
  alter: Alter
  octave: number
}

/** Como os nomes de nota são exibidos (é CONFIGURAÇÃO, não idioma — ver `noteLabel`). */
export type Naming = 'letters' | 'solfege'

/** Semitons de cada grau natural acima do dó da mesma oitava. */
export const STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export const SOLFEGE = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'] as const

/** Símbolo de cada acidente (o "natural" só aparece quando pedido explicitamente). */
export const ALTER_SYMBOL: Record<Alter, string> = { [-1]: '♭', 0: '', 1: '♯' }

export const STEPS: readonly Step[] = [0, 1, 2, 3, 4, 5, 6]
export const ALTERS: readonly Alter[] = [-1, 0, 1]

/**
 * Índice diatônico: a posição vertical da nota na pauta, ignorando o acidente
 * (Fá♯3, Fá3 e Fá♭3 têm o mesmo). C4 = 28, E4 = 30, G2 = 18.
 */
export function diatonic(s: Spelled): number {
  return s.octave * 7 + s.step
}

/** Inverso de `diatonic`: qual nota ocupa aquela posição, com o acidente dado. */
export function spelledAt(d: number, alter: Alter = 0): Spelled {
  const octave = Math.floor(d / 7)
  const step = (d - octave * 7) as Step
  return { step, alter, octave }
}

/** Altura soando (MIDI). Só usado na saída de áudio. MIDI 60 = C4. */
export function midiOf(s: Spelled): number {
  return STEP_SEMITONES[s.step] + s.alter + (s.octave + 1) * 12
}

/** Nome da letra sozinha, na nomenclatura escolhida ("F" ou "Fá"). */
export function stepLabel(step: Step, naming: Naming): string {
  return naming === 'solfege' ? SOLFEGE[step] : LETTERS[step]
}

/** Nome completo da nota ("F♯", "Fá♯", "F♯4"). */
export function noteLabel(s: Spelled, naming: Naming, withOctave = false): string {
  const name = stepLabel(s.step, naming) + ALTER_SYMBOL[s.alter]
  return withOctave ? `${name}${s.octave}` : name
}

/** Chave do VexFlow: letra minúscula + acidente + "/" + oitava, ex.: "f#/4". */
export function toVexKey(s: Spelled): { key: string; accidental: string | null } {
  const acc = s.alter === 1 ? '#' : s.alter === -1 ? 'b' : ''
  return { key: `${LETTERS[s.step].toLowerCase()}${acc}/${s.octave}`, accidental: acc || null }
}

/**
 * Duas notas são "a mesma resposta"? Compara SEMPRE a grafia (letra + acidente) — é o que
 * o aluno está aprendendo, então Fá♯ nunca vale por Sol♭. A oitava só entra se pedida.
 */
export function sameNote(a: Spelled, b: Spelled, requireOctave = false): boolean {
  if (a.step !== b.step || a.alter !== b.alter) return false
  return requireOctave ? a.octave === b.octave : true
}
