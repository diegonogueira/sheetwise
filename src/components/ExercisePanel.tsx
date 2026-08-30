import type { ReactNode } from 'react'
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Staff, type Mark } from './Staff/Staff'
import { AlterPicker, NotePicker } from './NotePicker'
import { taskOf } from '../core/module'
import { diatonic, noteLabel, spelledAt, type Alter, type Naming } from '../core/pitch'
import { keyTonicLabel, type KeyMode, type KeySignature } from '../core/keys'
import type { LedgerCount } from '../core/clef'
import type { AccidentalMode } from '../core/exercise'
import type { ExerciseApi } from '../hooks/useExercise'
import { cx } from '../lib/cx'

function Result({ correct, children }: { correct: boolean; children: ReactNode }) {
  return (
    <div
      className={cx(
        'flex items-center gap-1.5 text-sm font-medium',
        correct ? 'text-correct' : 'text-wrong',
      )}
    >
      {correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      <span>{children}</span>
    </div>
  )
}

/** Resultado + "Próxima": em paisagem curta vão lado a lado p/ economizar altura. */
function Actions({
  compact,
  correct,
  next,
  children,
}: {
  compact: boolean
  correct: boolean
  next: ReactNode
  children: ReactNode
}) {
  return (
    <div className={cx('flex items-center', compact ? 'flex-row gap-3' : 'flex-col gap-4')}>
      <Result correct={correct}>{children}</Result>
      {next}
    </div>
  )
}

interface BodyProps {
  exercise: ExerciseApi
  naming: Naming
  ledgerBelow: LedgerCount
  ledgerAbove: LedgerCount
  accidentalMode: AccidentalMode
  slotHints: boolean
  compact: boolean
  nextButton: ReactNode
}

/** Largura da pauta conforme a densidade. */
function staffWidth(compact: boolean): number {
  return compact ? 260 : 340
}

/**
 * Ler notas: a nota acende na pauta e o aluno nomeia. A pauta nunca rotula a nota antes da
 * resposta (entregaria o exercício) — "mostrar o nome" só vale depois, na revelação.
 */
function ReadNoteBody(props: BodyProps) {
  const { exercise, naming, ledgerBelow, ledgerAbove, compact, nextButton } = props
  const { question, status, chosenNote } = exercise
  const { t } = useTranslation()
  const answered = status !== 'idle'
  const correct = status === 'correct'
  const note = question.note!

  const marks: Mark[] = [
    {
      slot: diatonic(note),
      // com armadura a nota é desenhada LIMPA: o acidente já está na clave, repeti-lo ao
      // lado da nota entregaria a resposta (e não é como a partitura escreve)
      alter: question.keySig ? 0 : note.alter,
      // ao acertar, a própria nota fica verde; ao errar ela continua em destaque, e o
      // texto abaixo é que diz qual era
      variant: correct ? 'correct' : 'accent',
      clef: question.clef,
    },
  ]

  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'gap-2' : 'gap-4')}>
      <p className="text-sm text-muted">{t('exercise.readNote.prompt')}</p>
      <Staff
        staves={question.staves}
        ledgerBelow={ledgerBelow}
        ledgerAbove={ledgerAbove}
        keySig={question.keySig}
        marks={marks}
        width={staffWidth(compact)}
      />
      {!answered ? (
        // Com armadura o acidente É a pergunta: ele não está ao lado da nota, sai da leitura
        // da armadura, então o aluno o escolhe e as letras acompanham a escolha. Sem
        // armadura o acidente está desenhado à vista, e repeti-lo num seletor só testaria
        // cópia — aí as letras já vêm com ele e a resposta é só a letra.
        <div className="flex w-full flex-col items-center gap-2">
          {question.keySig && (
            <AlterPicker alter={exercise.alter} onAlter={exercise.setAlter} compact={compact} />
          )}
          <NotePicker
            naming={naming}
            alter={question.keySig ? exercise.alter : note.alter}
            onPick={exercise.answerName}
            compact={compact}
          />
        </div>
      ) : (
        <Actions compact={compact} correct={correct} next={nextButton}>
          {correct
            ? t('exercise.readNote.correct', { note: noteLabel(note, naming, true) })
            : t('exercise.readNote.wrong', {
                note: noteLabel(note, naming, true),
                chosen: chosenNote ? noteLabel(chosenNote, naming) : '—',
              })}
        </Actions>
      )}
    </div>
  )
}

/**
 * Marcar notas: o enunciado dá o nome e o aluno clica na pauta. Vale qualquer oitava da
 * faixa desenhada (`validSlots`); ao errar, todas as posições certas aparecem como fantasmas.
 */
function MarkNoteBody(props: BodyProps) {
  const { exercise, naming, ledgerBelow, ledgerAbove, accidentalMode, slotHints, compact, nextButton } = props
  const { question, status, chosenSlot } = exercise
  const { t } = useTranslation()
  const answered = status !== 'idle'
  const correct = status === 'correct'
  const note = question.note!

  // com armadura nada é desenhado ao lado da nota — o acidente já está na clave
  const drawnAlter = (a: Alter): Alter => (question.keySig ? 0 : a)
  const marks: Mark[] = []
  if (chosenSlot !== null) {
    marks.push({
      slot: chosenSlot,
      alter: drawnAlter(exercise.chosenAlter ?? exercise.alter),
      variant: correct ? 'correct' : 'wrong',
    })
  }
  if (status === 'wrong') {
    for (const slot of question.validSlots ?? []) {
      marks.push({ slot, alter: drawnAlter(note.alter), variant: 'ghost' })
    }
  }

  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'gap-2' : 'gap-4')}>
      <p className="text-sm text-muted">
        <Trans
          i18nKey="exercise.markNote.prompt"
          values={{ note: noteLabel(note, naming) }}
          components={{ note: <span className="font-semibold text-accent" /> }}
        />
      </p>
      {/* com armadura o acidente não é armado: quem altera a posição clicada é a própria
          armadura desenhada, exatamente como na partitura */}
      {!answered && accidentalMode === 'note' && (
        <AlterPicker alter={exercise.alter} onAlter={exercise.setAlter} compact={compact} />
      )}
      <Staff
        staves={question.staves}
        ledgerBelow={ledgerBelow}
        ledgerAbove={ledgerAbove}
        keySig={question.keySig}
        marks={marks}
        onSelect={answered ? undefined : (slot) => exercise.answerSlot(slot)}
        hints={!answered && slotHints ? naming : null}
        width={staffWidth(compact)}
      />
      {!answered ? (
        <p className="text-xs text-faint">{t('exercise.markNote.hint')}</p>
      ) : (
        <Actions compact={compact} correct={correct} next={nextButton}>
          {/* no acerto o texto nomeia o que o aluno DE FATO marcou: a resposta é válida em
              qualquer oitava, então citar a oitava sorteada confundiria */}
          {correct
            ? t('exercise.markNote.correct', {
                note:
                  chosenSlot !== null
                    ? noteLabel(spelledAt(chosenSlot, exercise.chosenAlter ?? 0), naming, true)
                    : noteLabel(note, naming),
              })
            : t('exercise.markNote.wrong', {
                note: noteLabel(note, naming),
                chosen:
                  chosenSlot !== null
                    ? noteLabel(spelledAt(chosenSlot, exercise.chosenAlter ?? 0), naming, true)
                    : '—',
              })}
        </Actions>
      )}
    </div>
  )
}

/** Nome completo de uma tonalidade ("Ré maior"). */
function keyLabel(sig: KeySignature, mode: KeyMode, naming: Naming, t: TFunction): string {
  return t(`exercise.key.${mode}`, { tonic: keyTonicLabel(sig, mode, naming) })
}

/**
 * Tonalidade: a armadura é desenhada e o aluno nomeia a tonalidade. O enunciado sempre diz
 * qual modo está pedindo — a armadura sozinha serve à maior e à relativa menor.
 */
function ReadKeyBody(props: BodyProps) {
  const { exercise, naming, compact, nextButton } = props
  const { question, status, chosenKey } = exercise
  const { t } = useTranslation()
  const answered = status !== 'idle'
  const correct = status === 'correct'
  const ask = question.keyAsk!
  const sig = question.keySig!

  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'gap-2' : 'gap-4')}>
      <p className="text-sm text-muted">
        {t(ask === 'major' ? 'exercise.readKey.promptMajor' : 'exercise.readKey.promptMinor')}
      </p>
      <Staff
        staves={question.staves}
        ledgerBelow={0}
        ledgerAbove={0}
        keySig={sig}
        width={staffWidth(compact)}
      />
      {!answered ? (
        <div className={cx('grid w-full gap-1.5', compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4')}>
          {question.keyChoices!.map((choice) => (
            <button
              key={choice.fifths}
              type="button"
              onClick={() => exercise.answerKey(choice)}
              className="rounded-xl border border-line bg-surface px-1 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft"
            >
              {keyLabel(choice, ask, naming, t)}
            </button>
          ))}
        </div>
      ) : (
        <Actions compact={compact} correct={correct} next={nextButton}>
          {correct
            ? t('exercise.readKey.correct', { key: keyLabel(sig, ask, naming, t) })
            : t('exercise.readKey.wrong', {
                key: keyLabel(sig, ask, naming, t),
                chosen: chosenKey ? keyLabel(chosenKey, ask, naming, t) : '—',
              })}
        </Actions>
      )}
    </div>
  )
}

export function ExercisePanel(props: Omit<BodyProps, 'nextButton'>) {
  const { exercise, compact } = props
  const { t } = useTranslation()
  const answered = exercise.status !== 'idle'
  const correct = exercise.status === 'correct'

  const nextButton = (
    <button
      type="button"
      onClick={exercise.next}
      className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
    >
      {t('exercise.next')} <ArrowRight size={16} />
    </button>
  )

  const body = { ...props, nextButton }
  const task = taskOf(exercise.module)

  return (
    <section
      className={cx(
        'rounded-2xl border bg-surface',
        compact ? 'p-3' : 'p-5',
        answered && !correct && 'animate-shake',
        !answered ? 'border-line' : correct ? 'border-correct/40' : 'border-wrong/40',
      )}
    >
      {task === 'readNote' ? (
        <ReadNoteBody {...body} />
      ) : task === 'markNote' ? (
        <MarkNoteBody {...body} />
      ) : (
        <ReadKeyBody {...body} />
      )}
    </section>
  )
}
