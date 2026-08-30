import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { SettingsPanel } from './components/Settings'
import { ExercisePanel } from './components/ExercisePanel'
import { useSettings, useModuleConfig } from './store/settings'
import { useExercise } from './hooks/useExercise'
import { useRoute } from './hooks/useRoute'
import { useShortLandscape } from './hooks/useMediaQuery'
import { clefSetOf, isNoteModule, taskOf } from './core/module'
import type { KeyConfig, NoteConfig } from './core/exercise'
import { loadInstrument, playMidi } from './audio/player'
import { cx } from './lib/cx'

export default function App() {
  const { t, i18n } = useTranslation()
  const [module, navigate] = useRoute()
  const naming = useSettings((s) => s.naming)
  const audioEnabled = useSettings((s) => s.audioEnabled)
  const cClefLines = useSettings((s) => s.cClefLines)
  const keyAsk = useSettings((s) => s.keyAsk)
  const keyMaxAccidentals = useSettings((s) => s.keyMaxAccidentals)
  const keyClefs = useSettings((s) => s.keyClefs)
  const { ledgerBelow, ledgerAbove, accidentals, slotHints } = useModuleConfig(module)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // paisagem curta (celular deitado): layout compacto que cabe numa tela
  const compact = useShortLandscape()

  // identidade estável: o exercício só regenera a questão quando a config muda de fato
  const noteCfg = useMemo<NoteConfig>(
    () => ({ ledgerBelow, ledgerAbove, accidentals, cClefLines }),
    [ledgerBelow, ledgerAbove, accidentals, cClefLines],
  )
  const keyCfg = useMemo<KeyConfig>(
    () => ({ ask: keyAsk, maxAccidentals: keyMaxAccidentals, clefs: keyClefs }),
    [keyAsk, keyMaxAccidentals, keyClefs],
  )

  const exercise = useExercise({
    module,
    note: noteCfg,
    key: keyCfg,
    onReveal: (midi) => {
      if (audioEnabled) void playMidi(midi)
    },
  })

  // pré-carrega o piano para a primeira nota soar sem atraso
  useEffect(() => {
    if (audioEnabled) void loadInstrument()
  }, [audioEnabled])

  // título do módulo: grupo (tarefa) + conjunto de claves, como no menu
  const setId = clefSetOf(module)
  const moduleTitle = isNoteModule(module)
    ? `${t(`nav.group.${taskOf(module)}`)} — ${t(`clefSet.${setId}`)}`
    : t('nav.item.readKey')

  // título da aba reflete o módulo ativo e o idioma corrente
  useEffect(() => {
    document.title = `Sheetwise — ${moduleTitle}`
  }, [moduleTitle, i18n.language])

  return (
    <div className={cx('flex flex-col', compact ? 'h-[100dvh] overflow-hidden' : 'min-h-screen')}>
      <TopBar
        modeTitle={moduleTitle}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleSidebar={() => setSidebarOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          module={module}
          onSelect={navigate}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main
          className={cx(
            'mx-auto flex w-full max-w-3xl flex-1 flex-col px-4',
            compact ? 'min-h-0 gap-2 overflow-y-auto py-2' : 'gap-4 py-5',
          )}
        >
          <h1 className={cx('font-semibold text-ink', compact ? 'sr-only' : 'text-sm')}>
            {moduleTitle}
          </h1>

          <ExercisePanel
            exercise={exercise}
            naming={naming}
            ledgerBelow={ledgerBelow}
            ledgerAbove={ledgerAbove}
            accidentals={accidentals}
            slotHints={slotHints}
            compact={compact}
          />
        </main>
      </div>

      {settingsOpen && <SettingsPanel module={module} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
