// Mapa entre cada módulo de treino e sua URL (em inglês). A URL é a fonte da verdade do
// módulo ativo — ver `src/hooks/useRoute.ts`. Os caminhos são derivados de tarefa +
// conjunto de claves, então não há lista para manter em dia aqui.

import { MODULES, isNoteModule, type Module } from '../core/module'
import type { ClefSetId } from '../core/clefSet'
import type { NoteTask } from '../core/module'

const TASK_PATH: Record<NoteTask | 'readKey', string> = {
  readNote: '/read-note',
  markNote: '/mark-note',
  readKey: '/read-key',
}

const SET_PATH: Record<ClefSetId, string> = {
  treble: 'treble',
  bass: 'bass',
  c: 'c-clef',
  piano: 'piano',
  cello: 'cello',
  viola: 'viola',
}

/** Módulo aberto quando a URL não aponta para nenhum (ex.: "/" na primeira visita). */
export const DEFAULT_MODULE: Module = 'readNote:treble'

/** Caminho canônico (kebab-case, em inglês) de um módulo. */
export function pathForModule(m: Module): string {
  if (!isNoteModule(m)) return TASK_PATH.readKey
  const [task, set] = m.split(':') as [NoteTask, ClefSetId]
  return `${TASK_PATH[task]}/${SET_PATH[set]}`
}

const PATH_MODULE: Record<string, Module> = Object.fromEntries(
  MODULES.map((m) => [pathForModule(m), m]),
)

/** Resolve um pathname para o módulo correspondente (cai no padrão se desconhecido). */
export function moduleFromPath(pathname: string): Module {
  const clean = pathname.replace(/\/+$/, '') || '/'
  return PATH_MODULE[clean] ?? DEFAULT_MODULE
}
