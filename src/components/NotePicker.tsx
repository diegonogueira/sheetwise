import { useTranslation } from 'react-i18next'
import { ALTER_SYMBOL, STEPS, stepLabel, type Alter, type Naming, type Spelled } from '../core/pitch'
import { AccidentalGlyph } from './Staff/AccidentalGlyph'
import { cx } from '../lib/cx'

/**
 * Escolha de nota: as 7 letras, já com o acidente da questão estampado (C♯ D♯ E♯…). São 7
 * botões em vez de 21, e o aluno responde o que a pauta esconde — a letra —, não o acidente,
 * que está desenhado ali na frente dele.
 */
interface NotePickerProps {
  naming: Naming
  /** acidente da questão: entra no rótulo e na resposta */
  alter: Alter
  onPick: (note: Spelled) => void
  /** letras a oferecer; padrão: as 7 */
  steps?: readonly Spelled['step'][]
  compact?: boolean
}

const ALTERS: Alter[] = [-1, 0, 1]

/**
 * ♭ ♮ ♯ vêm da fonte musical (ver `AccidentalGlyph`), não da fonte da interface: assim o
 * botão mostra o mesmo sinal que aparece na pauta e os três ficam alinhados entre si. O
 * botão tem ~44px, o mínimo de toque confortável no celular.
 */
export function AlterPicker({
  alter,
  onAlter,
  compact = false,
}: {
  alter: Alter
  onAlter: (a: Alter) => void
  compact?: boolean
}) {
  return (
    <div className="inline-flex rounded-xl bg-line p-0.5">
      {ALTERS.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onAlter(a)}
          aria-pressed={alter === a}
          className={cx(
            'flex items-center justify-center rounded-lg transition-colors',
            compact ? 'h-8 w-11' : 'h-11 w-14',
            alter === a ? 'bg-surface text-ink shadow-sm' : 'text-faint hover:text-ink',
          )}
        >
          <AccidentalGlyph alter={a} point={compact ? 26 : 34} />
        </button>
      ))}
    </div>
  )
}

export function NotePicker({ naming, alter, onPick, steps = STEPS, compact = false }: NotePickerProps) {
  useTranslation() // re-renderiza ao trocar de idioma (os rótulos vêm do núcleo)
  return (
    <div className={cx('grid w-full gap-1.5', compact ? 'grid-cols-7' : 'grid-cols-4 sm:grid-cols-7')}>
      {steps.map((step) => (
        <button
          key={step}
          type="button"
          onClick={() => onPick({ step, alter, octave: 4 })}
          className="rounded-xl border border-line bg-surface px-1 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft"
        >
          {stepLabel(step, naming)}
          {ALTER_SYMBOL[alter]}
        </button>
      ))}
    </div>
  )
}
