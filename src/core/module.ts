// Identidade dos módulos de treino — fonte única da lista e da ordem do menu.
//
// Um módulo é `tarefa:conjunto-de-claves` (ex.: `readNote:piano`), derivado por template
// literal em vez de enumerado à mão: acrescentar um conjunto de claves em `clefSet.ts` cria
// os módulos de leitura e de marcação sozinho, e o TypeScript passa a exigir os `Record`
// completos em todo lugar. A tonalidade não se multiplica por clave (a clave dela é config),
// então entra como um id avulso.

import { CLEF_SET_IDS, type ClefSetId } from './clefSet'

/** Tarefas que um módulo pode ter. */
export const TASKS = ['readNote', 'markNote', 'readKey'] as const
export type Task = (typeof TASKS)[number]

/** Tarefas que se multiplicam por conjunto de claves. */
export const NOTE_TASKS = ['readNote', 'markNote'] as const
export type NoteTask = (typeof NOTE_TASKS)[number]

/** Módulo de nota: `readNote:treble`, `markNote:piano`, ... */
export type NoteModule = `${NoteTask}:${ClefSetId}`
export type Module = NoteModule | 'readKey'

export const MODULES: readonly Module[] = [
  ...NOTE_TASKS.flatMap((task) => CLEF_SET_IDS.map((set): NoteModule => `${task}:${set}`)),
  'readKey',
]

/** A tarefa de um módulo. */
export function taskOf(m: Module): Task {
  return m === 'readKey' ? 'readKey' : (m.split(':')[0] as NoteTask)
}

/** O conjunto de claves de um módulo de nota (`null` na tonalidade — ela usa a config). */
export function clefSetOf(m: Module): ClefSetId | null {
  return m === 'readKey' ? null : (m.split(':')[1] as ClefSetId)
}

export function isNoteModule(m: Module): m is NoteModule {
  return m !== 'readKey'
}

/** Módulos em que se clica na pauta (mostram o seletor de acidente e a pauta interativa). */
export function isMarkNote(m: Module): boolean {
  return taskOf(m) === 'markNote'
}

/** Módulos que usam a clave de Dó — únicos que mostram a config de linhas. */
export function usesCClef(m: Module): boolean {
  return clefSetOf(m) === 'c'
}
