import { useCallback, useState } from 'react'
import {
  checkKey,
  checkNoteName,
  checkSlot,
  generateQuestion,
  type KeyConfig,
  type NoteConfig,
  type Question,
} from '../core/exercise'
import type { Module } from '../core/module'
import type { KeySignature } from '../core/keys'
import { midiOf, spelledAt, type Alter, type Spelled } from '../core/pitch'

export type Status = 'idle' | 'correct' | 'wrong'

interface UseExerciseArgs {
  /** módulo ativo — controlado externamente (vem da URL) */
  module: Module
  note: NoteConfig
  key: KeyConfig
  /** chamado ao responder, com o(s) MIDI(s) a soar */
  onReveal?: (midi: number | number[]) => void
}

export interface ExerciseApi {
  module: Module
  question: Question
  status: Status
  /** readNote: grafia escolhida nas alternativas */
  chosenNote: Spelled | null
  /** markNote: posição clicada na pauta */
  chosenSlot: number | null
  /** markNote: acidente armado no seletor (aplicado ao clicar) */
  alter: Alter
  /** readKey: armadura escolhida */
  chosenKey: KeySignature | null
  setAlter: (a: Alter) => void
  answerName: (note: Spelled) => void
  answerSlot: (slot: number) => void
  answerKey: (sig: KeySignature) => void
  next: () => void
}

export function useExercise({ module, note, key, onReveal }: UseExerciseArgs): ExerciseApi {
  const [question, setQuestion] = useState<Question>(() => generateQuestion({ module, note, key }))
  const [status, setStatus] = useState<Status>('idle')
  const [chosenNote, setChosenNote] = useState<Spelled | null>(null)
  const [chosenSlot, setChosenSlot] = useState<number | null>(null)
  const [chosenKey, setChosenKey] = useState<KeySignature | null>(null)
  const [alter, setAlter] = useState<Alter>(0)

  const newQuestion = useCallback(() => {
    setQuestion(generateQuestion({ module, note, key }))
    setStatus('idle')
    setChosenNote(null)
    setChosenSlot(null)
    setChosenKey(null)
    setAlter(0)
  }, [module, note, key])

  const next = useCallback(() => newQuestion(), [newQuestion])

  const answerName = useCallback(
    (chosen: Spelled) => {
      if (status !== 'idle') return
      setChosenNote(chosen)
      setStatus(checkNoteName(question, chosen) ? 'correct' : 'wrong')
      if (question.note) onReveal?.(midiOf(question.note))
    },
    [status, question, onReveal],
  )

  const answerSlot = useCallback(
    (slot: number) => {
      if (status !== 'idle') return
      setChosenSlot(slot)
      setStatus(checkSlot(question, slot, alter) ? 'correct' : 'wrong')
      // soa o que o aluno DE FATO marcou, não a resposta — é o retorno honesto do clique
      onReveal?.(midiOf(spelledAt(slot, alter)))
    },
    [status, question, alter, onReveal],
  )

  const answerKey = useCallback(
    (sig: KeySignature) => {
      if (status !== 'idle') return
      setChosenKey(sig)
      setStatus(checkKey(question, sig) ? 'correct' : 'wrong')
    },
    [status, question],
  )

  // Regenera ao trocar de módulo ou de configuração. As configs chegam memoizadas do App,
  // então a identidade só muda quando um valor muda de fato.
  //
  // Isto acontece DURANTE o render (o padrão do React para ajustar estado quando uma prop
  // muda), e não num efeito: num efeito sobraria um quadro com a questão do módulo antigo,
  // e cada tarefa lê campos que só a sua questão tem — a tonalidade lendo `keyChoices` de
  // uma questão de nota quebrava a tela, que só voltava com um F5.
  const [source, setSource] = useState({ module, note, key })
  if (source.module !== module || source.note !== note || source.key !== key) {
    setSource({ module, note, key })
    newQuestion()
  }

  return {
    module,
    question,
    status,
    chosenNote,
    chosenSlot,
    chosenKey,
    alter,
    setAlter,
    answerName,
    answerSlot,
    answerKey,
    next,
  }
}
