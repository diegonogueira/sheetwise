// Motor de exercício: gera questões e valida respostas. Puro, sem React.
//
// Tarefa readNote (Pauta → Nota): uma nota acende na pauta; o aluno escolhe o nome dela.
//   Octave-agnóstico: vale a GRAFIA (letra + acidente) em qualquer oitava. Fá♯ nunca é
//   aceito no lugar de Sol♭ — a grafia é justamente o que se está aprendendo.
// Tarefa markNote (Nota → Pauta): pede-se uma nota pelo nome; o aluno clica na pauta.
//   Qualquer posição da faixa desenhada que grafe aquela nota vale — `validSlots` é a
//   fonte única da verdade (espelha o `validPositions` do fretwise).
// Tarefa readKey (Armadura → Tonalidade): mostra-se a armadura; o aluno nomeia a tonalidade.
//   A armadura sozinha é ambígua entre relativa maior e menor, então o enunciado sempre diz
//   qual modo está pedindo (`keyAsk`) e todas as alternativas são desse mesmo modo.

import {
  CLEF,
  slotsInRange,
  staffRange,
  type ClefId,
  type LedgerCount,
} from './clef'
import {
  CLEF_SET,
  clefsForSet,
  DEFAULT_C_CLEF_LINES,
  type CClefLine,
} from './clefSet'
import {
  isNoteModule,
  taskOf,
  clefSetOf,
  type Module,
} from './module'
import { ALTERS, diatonic, spelledAt, type Alter, type Spelled } from './pitch'
import {
  signaturesUpTo,
  type KeyMode,
  type KeySignature,
} from './keys'

export type Rng = () => number

/** Modos que a tonalidade pode perguntar; `both` sorteia um a cada questão. */
export type KeyAsk = KeyMode | 'both'

/** Configuração de um módulo de nota (leitura / marcação). */
export interface NoteConfig {
  ledgerBelow: LedgerCount
  ledgerAbove: LedgerCount
  /** inclui sustenidos e bemóis nas questões (senão, só notas naturais) */
  accidentals: boolean
  /** linhas ocupadas pela clave de Dó (só usado pelo conjunto `c`) */
  cClefLines: readonly CClefLine[]
}

/** Configuração do módulo de tonalidade. */
export interface KeyConfig {
  ask: KeyAsk
  /** máximo de acidentes na armadura (4 = até 4 sustenidos/bemóis; 7 = todas) */
  maxAccidentals: number
  /** claves em que a armadura pode ser desenhada (ao menos uma) */
  clefs: ClefId[]
}

export const DEFAULT_NOTE_CONFIG: NoteConfig = {
  ledgerBelow: 1,
  ledgerAbove: 1,
  accidentals: false,
  cClefLines: DEFAULT_C_CLEF_LINES,
}

export const DEFAULT_KEY_CONFIG: KeyConfig = {
  ask: 'major',
  maxAccidentals: 4,
  clefs: ['treble', 'bass'],
}

export interface Question {
  module: Module
  /** clave desta questão; no sistema de piano, a pauta em que a nota caiu */
  clef: ClefId
  /** claves desenhadas na tela (uma só, ou as duas do sistema de piano, do grave ao agudo) */
  staves: ClefId[]
  /** readNote / markNote: a nota da questão */
  note?: Spelled
  /** markNote: TODOS os diatônicos da faixa desenhada que valem como resposta */
  validSlots?: number[]
  /** readKey: a armadura sorteada */
  keySig?: KeySignature
  /** readKey: alternativas embaralhadas, todas do mesmo modo */
  keyChoices?: KeySignature[]
  /** readKey: qual modo está sendo perguntado nesta questão */
  keyAsk?: KeyMode
}

export interface GenOptions {
  module: Module
  rng?: Rng
  /** obrigatório nos módulos de nota */
  note?: NoteConfig
  /** obrigatório no módulo de tonalidade */
  key?: KeyConfig
}

function randInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive)
}

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[randInt(rng, arr.length)]
}

/** Embaralha no lugar (Fisher–Yates) e devolve. */
function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** A faixa lida de uma clave, já com as linhas suplementares da config. */
export function rangeFor(clef: ClefId, config: NoteConfig): { lo: number; hi: number } {
  return staffRange(CLEF[clef], config.ledgerBelow, config.ledgerAbove)
}

/** Acidentes disponíveis conforme a config. */
function altersFor(config: NoteConfig): readonly Alter[] {
  return config.accidentals ? ALTERS : [0]
}

/**
 * Sorteia a nota da questão e a clave em que ela cai.
 *
 * No sistema de piano as duas pautas estão na tela: sorteia-se primeiro a pauta, depois a
 * nota dentro dela — assim as duas claves aparecem com a mesma frequência (sortear a nota
 * numa faixa unificada favoreceria a região central, onde as faixas se sobrepõem).
 */
function pickNote(
  module: Module,
  config: NoteConfig,
  rng: Rng,
): { clef: ClefId; staves: ClefId[]; note: Spelled } {
  const setId = clefSetOf(module)!
  const set = CLEF_SET[setId]
  const clefs = clefsForSet(set, config.cClefLines)
  const clef = pick(clefs, rng)
  const staves = set.layout === 'grand' ? clefs : [clef]
  const { lo, hi } = rangeFor(clef, config)
  const d = lo + randInt(rng, hi - lo + 1)
  const alter = pick(altersFor(config), rng)
  return { clef, staves, note: spelledAt(d, alter) }
}

function generateReadNote(module: Module, config: NoteConfig, rng: Rng): Question {
  const { clef, staves, note } = pickNote(module, config, rng)
  return { module, clef, staves, note }
}

function generateMarkNote(module: Module, config: NoteConfig, rng: Rng): Question {
  const { clef, staves, note } = pickNote(module, config, rng)
  // toda posição da(s) pauta(s) desenhada(s) com a mesma letra vale — o acidente vem do
  // seletor, não da posição vertical
  const validSlots = staves
    .flatMap((c) => slotsInRange(rangeFor(c, config)))
    .filter((d) => spelledAt(d).step === note.step)
  return { module, clef, staves, note, validSlots: [...new Set(validSlots)].sort((a, b) => a - b) }
}

function generateReadKey(config: KeyConfig, rng: Rng): Question {
  const ask: KeyMode = config.ask === 'both' ? pick(['major', 'minor'] as const, rng) : config.ask
  const pool = signaturesUpTo(config.maxAccidentals)
  const answer = pick(pool, rng)
  const others = shuffle(pool.filter((s) => s.fifths !== answer.fifths), rng).slice(0, 3)
  const clefs = config.clefs.length ? config.clefs : DEFAULT_KEY_CONFIG.clefs
  const clef = pick(clefs, rng)
  return {
    module: 'readKey',
    clef,
    staves: [clef],
    keySig: answer,
    keyAsk: ask,
    keyChoices: shuffle([answer, ...others], rng),
  }
}

export function generateQuestion(opts: GenOptions): Question {
  const { module, rng = Math.random } = opts
  if (!isNoteModule(module)) return generateReadKey(opts.key ?? DEFAULT_KEY_CONFIG, rng)
  const config = opts.note ?? DEFAULT_NOTE_CONFIG
  return taskOf(module) === 'markNote'
    ? generateMarkNote(module, config, rng)
    : generateReadNote(module, config, rng)
}

/** readNote: a grafia escolhida bate com a da nota? (a oitava não conta) */
export function checkNoteName(question: Question, chosen: Spelled): boolean {
  const note = question.note
  if (!note) return false
  return note.step === chosen.step && note.alter === chosen.alter
}

/** markNote: a posição clicada (com o acidente escolhido) é uma resposta válida? */
export function checkSlot(question: Question, slot: number, alter: Alter): boolean {
  const note = question.note
  if (!note || !question.validSlots) return false
  return question.validSlots.includes(slot) && alter === note.alter
}

/** readKey: a tonalidade escolhida é a da armadura? */
export function checkKey(question: Question, chosen: KeySignature): boolean {
  return question.keySig?.fifths === chosen.fifths
}

/** Diatônico da nota da questão (atalho usado pela UI ao revelar a resposta). */
export function answerSlot(question: Question): number | null {
  return question.note ? diatonic(question.note) : null
}
