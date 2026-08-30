import { useTranslation } from 'react-i18next'
import { ALTER_SYMBOL, STEPS, stepLabel, type Alter, type Naming, type Spelled } from '../core/pitch'
import { cx } from '../lib/cx'

/**
 * Escolha de nota: uma linha de 7 letras e, quando os acidentes estão ligados, uma linha
 * ♭ ♮ ♯ antes. Duas linhas em vez de 21 botões — e o mesmo seletor de acidente serve para
 * armar o acidente antes de clicar na pauta, no módulo "Marcar notas".
 */
interface NotePickerProps {
  naming: Naming
  /** acidente armado */
  alter: Alter
  onAlter: (a: Alter) => void
  /** mostra a linha de acidentes */
  accidentals: boolean
  /** clicar numa letra; ausente quando só o seletor de acidente é usado (markNote) */
  onPick?: (note: Spelled) => void
  /** letras a oferecer; padrão: as 7 */
  steps?: readonly Spelled['step'][]
  compact?: boolean
}

const ALTERS: Alter[] = [-1, 0, 1]

/**
 * ♭ ♮ ♯ são glifos musicais: no mesmo corpo de fonte das letras eles saem bem menores
 * (têm muito espaço em branco em volta) e viram um alvo pequeno demais no celular. Daí o
 * corpo maior e a largura folgada — o botão fica com ~44px, o mínimo de toque confortável.
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
            // flex + altura fixa em vez de padding: cada glifo (♭ tem haste, ♯ é simétrico,
            // ♮ é alto) tem métrica própria, e só o centro da CAIXA os alinha entre si
            'flex items-center justify-center rounded-lg leading-none transition-colors',
            compact ? 'h-8 w-11 text-xl' : 'h-11 w-14 text-2xl',
            alter === a ? 'bg-surface font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {a === 0 ? '♮' : ALTER_SYMBOL[a]}
        </button>
      ))}
    </div>
  )
}

export function NotePicker({
  naming,
  alter,
  onAlter,
  accidentals,
  onPick,
  steps = STEPS,
  compact = false,
}: NotePickerProps) {
  useTranslation() // re-renderiza ao trocar de idioma (os rótulos vêm do núcleo)
  return (
    <div className="flex w-full flex-col items-center gap-2">
      {accidentals && <AlterPicker alter={alter} onAlter={onAlter} compact={compact} />}
      {onPick && (
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
      )}
    </div>
  )
}
