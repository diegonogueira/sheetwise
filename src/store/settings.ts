import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { MODULES, type Module } from '../core/module'
import { DEFAULT_C_CLEF_LINES, type CClefLine } from '../core/clefSet'
import type { ClefId, LedgerCount } from '../core/clef'
import type { KeyAsk } from '../core/exercise'
import type { Naming } from '../core/pitch'

/** Configs que cada módulo lembra separadamente. */
export interface ModuleConfig {
  /** linhas suplementares abaixo da pauta (ver `LEDGER_COUNTS`) */
  ledgerBelow: LedgerCount
  /** linhas suplementares acima da pauta (ver `LEDGER_COUNTS`) */
  ledgerAbove: LedgerCount
  /** inclui sustenidos e bemóis nas questões */
  accidentals: boolean
  /** escreve a letra de cada posição na pauta (ajuda de leitura no "Marcar notas") */
  slotHints: boolean
}

const DEFAULT_MODULE_CONFIG: ModuleConfig = {
  ledgerBelow: 3,
  ledgerAbove: 3,
  accidentals: true,
  slotHints: false,
}

/** Replica uma config-semente para todos os módulos (estado inicial / migração). */
function modulesFrom(seed: ModuleConfig): Record<Module, ModuleConfig> {
  return Object.fromEntries(MODULES.map((m) => [m, { ...seed }])) as Record<Module, ModuleConfig>
}

/**
 * Aplica um patch à config de um módulo, sempre preenchendo campos ausentes com
 * `DEFAULT_MODULE_CONFIG`. Único ponto que normaliza um `ModuleConfig` parcial/ausente —
 * resiliente a `modules` corrompido (null) vindo do localStorage.
 */
function patchModule(
  modules: Record<Module, ModuleConfig> | undefined,
  module: Module,
  patch: Partial<ModuleConfig>,
): Record<Module, ModuleConfig> {
  const next = { ...modulesFrom(DEFAULT_MODULE_CONFIG), ...modules }
  next[module] = { ...DEFAULT_MODULE_CONFIG, ...modules?.[module], ...patch }
  return next
}

interface SettingsState {
  // --- globais (valem para todos os módulos) ---
  /** nomes em letras (C D E) ou solfejo (Dó Ré Mi) — é config, não idioma */
  naming: Naming
  audioEnabled: boolean
  // --- por módulo ---
  modules: Record<Module, ModuleConfig>
  // --- módulos de clave de Dó ---
  /** linhas em que a clave de Dó pode aparecer (ao menos uma) */
  cClefLines: CClefLine[]
  // --- módulo de tonalidade ---
  keyAsk: KeyAsk
  keyMaxAccidentals: number
  /** claves em que a armadura pode ser desenhada (ao menos uma) */
  keyClefs: ClefId[]
  setNaming: (v: Naming) => void
  setAudioEnabled: (v: boolean) => void
  setLedger: (module: Module, side: 'below' | 'above', v: LedgerCount) => void
  setAccidentals: (module: Module, v: boolean) => void
  setSlotHints: (module: Module, v: boolean) => void
  toggleCClefLine: (line: CClefLine) => void
  setKeyAsk: (v: KeyAsk) => void
  setKeyMaxAccidentals: (v: number) => void
  toggleKeyClef: (clef: ClefId) => void
}

/** Alterna um item mantendo ao menos um selecionado (a lista vazia trava o exercício). */
function toggleKeepingOne<T>(list: T[], item: T): T[] {
  const next = list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
  return next.length ? next : list
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      naming: 'letters',
      audioEnabled: true,
      modules: modulesFrom(DEFAULT_MODULE_CONFIG),
      cClefLines: [...DEFAULT_C_CLEF_LINES],
      keyAsk: 'major',
      keyMaxAccidentals: 4,
      keyClefs: ['treble', 'bass'],
      setNaming: (naming) => set({ naming }),
      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setLedger: (module, side, v) =>
        set((s) => ({
          modules: patchModule(s.modules, module, side === 'below' ? { ledgerBelow: v } : { ledgerAbove: v }),
        })),
      setAccidentals: (module, accidentals) =>
        set((s) => ({ modules: patchModule(s.modules, module, { accidentals }) })),
      setSlotHints: (module, slotHints) =>
        set((s) => ({ modules: patchModule(s.modules, module, { slotHints }) })),
      toggleCClefLine: (line) => set((s) => ({ cClefLines: toggleKeepingOne(s.cClefLines, line) })),
      setKeyAsk: (keyAsk) => set({ keyAsk }),
      setKeyMaxAccidentals: (keyMaxAccidentals) => set({ keyMaxAccidentals }),
      toggleKeyClef: (clef) => set((s) => ({ keyClefs: toggleKeepingOne(s.keyClefs, clef) })),
    }),
    {
      name: 'sheetwise-settings',
      version: 2,
      /**
       * v1 gravava `accidentals: false` em cada módulo. Como o backfill da leitura só
       * preenche campo AUSENTE (para não desfazer escolha de quem configurou), mudar o
       * padrão não alcançaria quem já tinha aberto o app: os módulos continuariam só com
       * notas naturais. A migração liga os acidentes em todos os módulos, uma vez.
       */
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as Partial<SettingsState>
        if (version >= 2) return state
        const stored = state.modules
        const modules = modulesFrom(DEFAULT_MODULE_CONFIG)
        for (const m of MODULES) {
          modules[m] = { ...DEFAULT_MODULE_CONFIG, ...stored?.[m], accidentals: true }
        }
        return { ...state, modules }
      },
    },
  ),
)

/**
 * Config do módulo ativo. Preenche campos ausentes com `DEFAULT_MODULE_CONFIG` (e tolera
 * `modules` ausente/null), então adicionar um campo novo a `ModuleConfig` é seguro mesmo
 * para estados já persistidos — o backfill acontece na leitura. `useShallow` mantém a
 * referência estável enquanto os valores não mudam.
 */
export function useModuleConfig(module: Module): ModuleConfig {
  return useSettings(useShallow((s) => ({ ...DEFAULT_MODULE_CONFIG, ...s.modules?.[module] })))
}
