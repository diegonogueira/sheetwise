// Claves: cada uma é só o DIATÔNICO DA SUA LINHA INFERIOR.
//
// Toda a geometria da pauta sai daí. Uma pauta tem 5 linhas; entre duas linhas há um
// espaço, então cada linha vale 2 diatônicos e cada meia-distância (linha→espaço) vale 1.
// Sabendo a nota da linha de baixo, qualquer posição vertical é aritmética simples — é o
// que `yForDiatonic` e `diatonicForY` fazem, e é por isso que o hit-test do clique não
// precisa de DOM nem do VexFlow para ser testado.

import { diatonic, type Spelled } from './pitch'

export const CLEF_IDS = [
  'treble',
  'bass',
  'alto',
  'tenor',
  'soprano',
  'mezzo',
  'baritone',
] as const

export type ClefId = (typeof CLEF_IDS)[number]

export interface Clef {
  id: ClefId
  /** nome da clave no VexFlow */
  vex: string
  /** índice diatônico da nota que cai na LINHA INFERIOR da pauta */
  bottomLine: number
}

/** Atalho legível para escrever as constantes abaixo. */
function d(step: Spelled['step'], octave: number): number {
  return diatonic({ step, alter: 0, octave })
}

export const CLEF: Record<ClefId, Clef> = {
  // Sol na 2ª linha: linha de baixo = Mi4
  treble: { id: 'treble', vex: 'treble', bottomLine: d(2, 4) },
  // Fá na 4ª linha: linha de baixo = Sol2
  bass: { id: 'bass', vex: 'bass', bottomLine: d(4, 2) },
  // Dó na 3ª linha (viola): dó central no meio → linha de baixo = Fá3
  alto: { id: 'alto', vex: 'alto', bottomLine: d(3, 3) },
  // Dó na 4ª linha (tenor): linha de baixo = Ré3
  tenor: { id: 'tenor', vex: 'tenor', bottomLine: d(1, 3) },
  // Dó na 1ª linha (soprano): o dó central É a linha de baixo
  soprano: { id: 'soprano', vex: 'soprano', bottomLine: d(0, 4) },
  // Dó na 2ª linha (mezzo-soprano): linha de baixo = Lá3
  mezzo: { id: 'mezzo', vex: 'mezzo-soprano', bottomLine: d(5, 3) },
  // Dó na 5ª linha (barítono): linha de baixo = Si2
  baritone: { id: 'baritone', vex: 'baritone-c', bottomLine: d(6, 2) },
}

/** Diatônico da linha SUPERIOR (4 linhas acima da inferior = 8 diatônicos). */
export function topLine(clef: Clef): number {
  return clef.bottomLine + 8
}

/** Quantas linhas suplementares mostrar de cada lado da pauta. */
export type LedgerCount = 0 | 1 | 2

/**
 * Faixa de leitura (diatônicos, inclusiva). Com 0 linhas suplementares já entram o espaço
 * logo abaixo e o logo acima da pauta — nenhum dos dois precisa de linha suplementar.
 * Cada linha suplementar estende 2 diatônicos (a linha + o espaço acima/abaixo dela).
 */
export function staffRange(
  clef: Clef,
  ledgerBelow: LedgerCount,
  ledgerAbove: LedgerCount,
): { lo: number; hi: number } {
  return {
    lo: clef.bottomLine - 1 - 2 * ledgerBelow,
    hi: topLine(clef) + 1 + 2 * ledgerAbove,
  }
}

/** Todos os diatônicos da faixa, do grave ao agudo. */
export function slotsInRange(range: { lo: number; hi: number }): number[] {
  const out: number[] = []
  for (let x = range.lo; x <= range.hi; x++) out.push(x)
  return out
}

/**
 * Y de um diatônico. `topLineY` é o Y da linha SUPERIOR e `spacing` a distância entre
 * linhas — ambos vêm do VexFlow (`stave.getYForLine(0)` / `getSpacingBetweenLines()`),
 * nunca de um `10` chumbado aqui. Y cresce para BAIXO, nota mais aguda = Y menor.
 */
export function yForDiatonic(d: number, clef: Clef, topLineY: number, spacing: number): number {
  return topLineY + ((topLine(clef) - d) * spacing) / 2
}

/** Inverso de `yForDiatonic`: qual posição da pauta foi clicada (arredonda para a mais perto). */
export function diatonicForY(y: number, clef: Clef, topLineY: number, spacing: number): number {
  return Math.round(topLine(clef) - ((y - topLineY) * 2) / spacing)
}
