// Conjuntos de clave: o que cada módulo do menu põe na tela.
//
// A distinção que importa: `grand` desenha as DUAS pautas ao mesmo tempo (piano — a nota cai
// numa delas, e é o sistema que desambigua o dó central); `single` desenha UMA pauta e sorteia
// a clave a cada questão, que é como violoncelo, trombone e viola leem de verdade — alternando
// de clave no meio da peça.

import type { ClefId } from './clef'

export const CLEF_SET_IDS = ['treble', 'bass', 'c', 'piano', 'cello', 'viola'] as const

export type ClefSetId = (typeof CLEF_SET_IDS)[number]

export type StaffLayout = 'single' | 'grand'

export interface ClefSet {
  id: ClefSetId
  /** claves possíveis; no `c` a lista vem da config `cClefLines` (ver `clefsForSet`) */
  clefs: ClefId[]
  layout: StaffLayout
}

export const CLEF_SET: Record<ClefSetId, ClefSet> = {
  treble: { id: 'treble', clefs: ['treble'], layout: 'single' },
  bass: { id: 'bass', clefs: ['bass'], layout: 'single' },
  // as linhas da clave de Dó são configuráveis (padrão: 3ª e 4ª)
  c: { id: 'c', clefs: ['alto', 'tenor'], layout: 'single' },
  // piano/harpa/órgão: sistema de duas pautas com chave
  piano: { id: 'piano', clefs: ['bass', 'treble'], layout: 'grand' },
  // violoncelo, fagote e trombone alternam Fá e Dó tenor
  cello: { id: 'cello', clefs: ['bass', 'tenor'], layout: 'single' },
  // viola lê em Dó alto e sobe para a clave de Sol nos agudos
  viola: { id: 'viola', clefs: ['alto', 'treble'], layout: 'single' },
}

/** Qual linha a clave de Dó ocupa — vira a `ClefId` correspondente. */
export const C_CLEF_LINES = ['1', '2', '3', '4', '5'] as const
export type CClefLine = (typeof C_CLEF_LINES)[number]

export const C_CLEF_BY_LINE: Record<CClefLine, ClefId> = {
  '1': 'soprano',
  '2': 'mezzo',
  '3': 'alto',
  '4': 'tenor',
  '5': 'baritone',
}

export const DEFAULT_C_CLEF_LINES: CClefLine[] = ['3', '4']

/**
 * Claves efetivas de um conjunto. Só o `c` depende de config; os outros são fixos.
 * Uma lista vazia de linhas cai no padrão — nenhum módulo pode ficar sem clave.
 */
export function clefsForSet(set: ClefSet, cClefLines: readonly CClefLine[]): ClefId[] {
  if (set.id !== 'c') return set.clefs
  const lines = cClefLines.length ? cClefLines : DEFAULT_C_CLEF_LINES
  return lines.map((l) => C_CLEF_BY_LINE[l])
}
