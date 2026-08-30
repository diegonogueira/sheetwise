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
import { syncStatusBar } from './native/statusBar'
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
  const { ledgerBelow, ledgerAbove, accidentalMode, keyMax, slotHints } = useModuleConfig(module)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // paisagem curta (celular deitado): layout compacto que cabe numa tela
  const compact = useShortLandscape()

  // identidade estável: o exercício só regenera a questão quando a config muda de fato
  const noteCfg = useMemo<NoteConfig>(
    () => ({ ledgerBelow, ledgerAbove, accidentalMode, keyMax, cClefLines }),
    [ledgerBelow, ledgerAbove, accidentalMode, keyMax, cClefLines],
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

  // no Android: status bar escondida na paisagem, visível (sem cobrir) no retrato
  useEffect(() => {
    void syncStatusBar(compact)
  }, [compact])

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
    <div
      className={cx('flex flex-col', compact ? 'h-[100dvh] overflow-hidden' : 'min-h-screen')}
      // a barra de gestos do Android é desenhada SOBRE o fim da WebView; sem descontá-la o
      // centro do layout cai abaixo do centro do que se enxerga
      style={{ paddingBottom: 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom))' }}
    >
      {/* reserva a área da status bar no retrato (o Android 15+ desenha edge-to-edge): o
          relógio e a bateria ficam sobre o fundo do app, não sobre o conteúdo. Na paisagem
          a status bar é escondida, o inset vira 0 e a faixa some sozinha. */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-40"
        style={{
          height: 'var(--safe-area-inset-top, env(safe-area-inset-top))',
          backgroundColor: 'var(--color-bg)',
        }}
      />
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

        {/* O exercício ocupa o centro da altura livre. O nome do módulo vive na TopBar (e
            aqui só para leitores de tela): como <h1> visível ele empurrava o cartão para
            baixo do meio — uma linha fina de texto no topo, e o olho lendo o vazio acima
            dela como topo, não como metade do miolo. `justify-center-safe` centraliza SEM
            cortar o começo quando a pauta cresce (faixa larga, sistema de piano). */}
        <main
          className={cx(
            'mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center-safe px-4',
            compact ? 'min-h-0 gap-2 overflow-y-auto py-2' : 'gap-4 py-5',
          )}
        >
          <h1 className="sr-only">{moduleTitle}</h1>

          <ExercisePanel
            exercise={exercise}
            naming={naming}
            ledgerBelow={ledgerBelow}
            ledgerAbove={ledgerAbove}
            accidentalMode={accidentalMode}
            slotHints={slotHints}
            compact={compact}
          />
        </main>
      </div>

      {settingsOpen && <SettingsPanel module={module} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
