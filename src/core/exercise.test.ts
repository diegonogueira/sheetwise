import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KEY_CONFIG,
  DEFAULT_NOTE_CONFIG,
  checkKey,
  checkNoteName,
  checkSlot,
  generateQuestion,
  rangeFor,
  type KeyConfig,
  type NoteConfig,
  type Rng,
} from './exercise'
import { CLEF_SET_IDS } from './clefSet'
import { MODULES, isNoteModule, taskOf, type Module } from './module'
import { diatonic, spelledAt, type Spelled } from './pitch'
import { alterInKey, signatureByFifths, signaturesUpTo } from './keys'

/** RNG determinístico (mulberry32) — as questões viram reproduzíveis. */
function seeded(seed: number): Rng {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1)

function noteCfg(patch: Partial<NoteConfig> = {}): NoteConfig {
  return { ...DEFAULT_NOTE_CONFIG, ...patch }
}

function keyCfg(patch: Partial<KeyConfig> = {}): KeyConfig {
  return { ...DEFAULT_KEY_CONFIG, ...patch }
}

const READ_MODULES = CLEF_SET_IDS.map((s): Module => `readNote:${s}`)
const MARK_MODULES = CLEF_SET_IDS.map((s): Module => `markNote:${s}`)

describe('cobertura dos módulos', () => {
  it('gera os 13 módulos (2 tarefas × 6 conjuntos + tonalidade)', () => {
    expect(MODULES).toHaveLength(13)
    expect(MODULES.filter(isNoteModule)).toHaveLength(12)
  })

  it('gera questão válida para todo módulo, em toda semente', () => {
    for (const module of MODULES) {
      for (const seed of SEEDS) {
        const q = generateQuestion({ module, note: noteCfg(), key: keyCfg(), rng: seeded(seed) })
        expect(q.module).toBe(module)
        expect(q.staves.length).toBeGreaterThan(0)
        expect(q.staves).toContain(q.clef)
      }
    }
  })
})

describe('readNote', () => {
  it('sorteia a nota sempre dentro da faixa desenhada', () => {
    for (const module of READ_MODULES) {
      for (const seed of SEEDS) {
        const cfg = noteCfg()
        const q = generateQuestion({ module, note: cfg, rng: seeded(seed) })
        const { lo, hi } = rangeFor(q.clef, cfg)
        expect(diatonic(q.note!)).toBeGreaterThanOrEqual(lo)
        expect(diatonic(q.note!)).toBeLessThanOrEqual(hi)
      }
    }
  })

  it('valida pela grafia, ignorando a oitava', () => {
    const q = generateQuestion({ module: 'readNote:treble', note: noteCfg(), rng: seeded(7) })
    const answer = q.note!
    expect(checkNoteName(q, { ...answer, octave: answer.octave + 2 })).toBe(true)
  })

  it('nunca aceita a enarmônica no lugar da grafia certa', () => {
    // Fá♯ e Sol♭ soam igual; só a grafia escrita vale
    const q = generateQuestion({ module: 'readNote:treble', note: noteCfg(), rng: seeded(3) })
    const fSharp: Spelled = { step: 3, alter: 1, octave: 4 }
    const gFlat: Spelled = { step: 4, alter: -1, octave: 4 }
    const forged = { ...q, note: fSharp }
    expect(checkNoteName(forged, fSharp)).toBe(true)
    expect(checkNoteName(forged, gFlat)).toBe(false)
  })

  it('sem acidentes na config só sorteia notas naturais', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readNote:treble',
        note: noteCfg({ accidentalMode: 'none' }),
        rng: seeded(seed),
      })
      expect(q.note!.alter).toBe(0)
    }
  })

  it('com armadura a nota é alterada PELA armadura, nunca por sorteio', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readNote:treble',
        note: noteCfg({ accidentalMode: 'key' }),
        rng: seeded(seed),
      })
      expect(q.keySig).toBeDefined()
      expect(q.note!.alter).toBe(alterInKey(q.note!.step, q.keySig!))
    }
  })

  it('a armadura respeita o teto de acidentes da config', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readNote:bass',
        note: noteCfg({ accidentalMode: 'key', keyMax: 2 }),
        rng: seeded(seed),
      })
      expect(Math.abs(q.keySig!.fifths)).toBeLessThanOrEqual(2)
    }
  })

  it('sem armadura a questão não desenha armadura nenhuma', () => {
    for (const mode of ['none', 'note'] as const) {
      const q = generateQuestion({
        module: 'readNote:treble',
        note: noteCfg({ accidentalMode: mode }),
        rng: seeded(5),
      })
      expect(q.keySig).toBeUndefined()
    }
  })

  it('com acidentes na config, sustenidos e bemóis aparecem', () => {
    const alters = new Set<number>()
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readNote:treble',
        note: noteCfg({ accidentalMode: 'note' }),
        rng: seeded(seed),
      })
      alters.add(q.note!.alter)
    }
    expect([...alters].sort()).toEqual([-1, 0, 1])
  })

  it('cobre as 7 letras ao longo das sementes', () => {
    const steps = new Set<number>()
    for (const seed of SEEDS) {
      steps.add(generateQuestion({ module: 'readNote:bass', note: noteCfg(), rng: seeded(seed) }).note!.step)
    }
    expect(steps.size).toBe(7)
  })
})

describe('markNote', () => {
  it('nunca deixa a questão sem resposta possível', () => {
    for (const module of MARK_MODULES) {
      for (const seed of SEEDS) {
        const q = generateQuestion({ module, note: noteCfg(), rng: seeded(seed) })
        expect(q.validSlots!.length).toBeGreaterThan(0)
      }
    }
  })

  it('lista só posições com a letra pedida, e todas as da faixa', () => {
    for (const seed of SEEDS) {
      const cfg = noteCfg()
      const q = generateQuestion({ module: 'markNote:treble', note: cfg, rng: seeded(seed) })
      const { lo, hi } = rangeFor(q.clef, cfg)
      for (const slot of q.validSlots!) {
        expect(spelledAt(slot).step).toBe(q.note!.step)
        expect(slot).toBeGreaterThanOrEqual(lo)
        expect(slot).toBeLessThanOrEqual(hi)
      }
      // nenhuma posição da faixa com a letra certa pode ter ficado de fora
      for (let d = lo; d <= hi; d++) {
        if (spelledAt(d).step === q.note!.step) expect(q.validSlots).toContain(d)
      }
    }
  })

  it('aceita a nota pedida em qualquer oitava da faixa', () => {
    const q = generateQuestion({ module: 'markNote:bass', note: noteCfg(), rng: seeded(11) })
    for (const slot of q.validSlots!) {
      expect(checkSlot(q, slot, q.note!.alter)).toBe(true)
    }
  })

  it('com armadura, a posição vale com o acidente que a armadura impõe', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'markNote:treble',
        note: noteCfg({ accidentalMode: 'key' }),
        rng: seeded(seed),
      })
      for (const slot of q.validSlots!) {
        const imposed = alterInKey(spelledAt(slot).step, q.keySig!)
        expect(checkSlot(q, slot, imposed)).toBe(true)
      }
    }
  })

  it('recusa posição fora da lista e acidente errado', () => {
    const q = generateQuestion({
      module: 'markNote:treble',
      note: noteCfg({ accidentalMode: 'note' }),
      rng: seeded(5),
    })
    const wrongSlot = q.validSlots![0] + 1
    expect(checkSlot(q, wrongSlot, q.note!.alter)).toBe(false)
    const wrongAlter = q.note!.alter === 1 ? 0 : 1
    expect(checkSlot(q, q.validSlots![0], wrongAlter)).toBe(false)
  })

  it('no sistema de piano aceita posições nas duas pautas', () => {
    // com as duas pautas na tela, a mesma letra aparece em ambas — as duas valem
    const seen = new Set<number>()
    for (const seed of SEEDS) {
      const q = generateQuestion({ module: 'markNote:piano', note: noteCfg(), rng: seeded(seed) })
      seen.add(q.validSlots!.length)
      expect(q.staves).toEqual(['bass', 'treble'])
    }
    expect(Math.max(...seen)).toBeGreaterThan(2)
  })
})

describe('conjuntos de clave', () => {
  it('o sistema de piano desenha as duas pautas e a nota cai numa delas', () => {
    const used = new Set<string>()
    for (const seed of SEEDS) {
      const q = generateQuestion({ module: 'readNote:piano', note: noteCfg(), rng: seeded(seed) })
      expect(q.staves).toEqual(['bass', 'treble'])
      used.add(q.clef)
    }
    expect([...used].sort()).toEqual(['bass', 'treble'])
  })

  it('violoncelo e viola alternam a clave numa pauta só', () => {
    for (const [module, expected] of [
      ['readNote:cello', ['bass', 'tenor']],
      ['readNote:viola', ['alto', 'treble']],
    ] as const) {
      const used = new Set<string>()
      for (const seed of SEEDS) {
        const q = generateQuestion({ module, note: noteCfg(), rng: seeded(seed) })
        expect(q.staves).toHaveLength(1)
        used.add(q.clef)
      }
      expect([...used].sort()).toEqual([...expected].sort())
    }
  })

  it('a clave de Dó segue as linhas configuradas', () => {
    const used = new Set<string>()
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readNote:c',
        note: noteCfg({ cClefLines: ['1', '5'] }),
        rng: seeded(seed),
      })
      used.add(q.clef)
    }
    expect([...used].sort()).toEqual(['baritone', 'soprano'])
  })

  it('cai no padrão (3ª e 4ª) se a lista de linhas ficar vazia', () => {
    const used = new Set<string>()
    for (const seed of SEEDS) {
      used.add(
        generateQuestion({ module: 'readNote:c', note: noteCfg({ cClefLines: [] }), rng: seeded(seed) }).clef,
      )
    }
    expect([...used].sort()).toEqual(['alto', 'tenor'])
  })
})

describe('readKey', () => {
  it('dá 4 armaduras distintas, uma delas a resposta', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({ module: 'readKey', key: keyCfg({ maxAccidentals: 7 }), rng: seeded(seed) })
      expect(q.keyChoices).toHaveLength(4)
      expect(new Set(q.keyChoices!.map((k) => k.fifths)).size).toBe(4)
      expect(q.keyChoices!.some((k) => checkKey(q, k))).toBe(true)
    }
  })

  it('respeita o limite de acidentes', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({ module: 'readKey', key: keyCfg({ maxAccidentals: 2 }), rng: seeded(seed) })
      for (const k of q.keyChoices!) expect(Math.abs(k.fifths)).toBeLessThanOrEqual(2)
    }
  })

  it('com poucas armaduras disponíveis não repete alternativa', () => {
    // com máx. 1 acidente só existem 3 armaduras: as alternativas caem para 3, sem duplicar
    for (const seed of SEEDS) {
      const q = generateQuestion({ module: 'readKey', key: keyCfg({ maxAccidentals: 1 }), rng: seeded(seed) })
      expect(new Set(q.keyChoices!.map((k) => k.fifths)).size).toBe(q.keyChoices!.length)
      expect(q.keyChoices!.length).toBe(signaturesUpTo(1).length)
    }
  })

  it('pergunta o modo configurado e sorteia os dois em "both"', () => {
    const asks = new Set<string>()
    for (const seed of SEEDS) {
      expect(generateQuestion({ module: 'readKey', key: keyCfg({ ask: 'minor' }), rng: seeded(seed) }).keyAsk).toBe('minor')
      asks.add(generateQuestion({ module: 'readKey', key: keyCfg({ ask: 'both' }), rng: seeded(seed) }).keyAsk!)
    }
    expect([...asks].sort()).toEqual(['major', 'minor'])
  })

  it('desenha a armadura só nas claves configuradas', () => {
    const used = new Set<string>()
    for (const seed of SEEDS) {
      used.add(generateQuestion({ module: 'readKey', key: keyCfg({ clefs: ['alto'] }), rng: seeded(seed) }).clef)
    }
    expect([...used]).toEqual(['alto'])
  })

  it('valida pela armadura, não pelo nome do modo', () => {
    const q = generateQuestion({ module: 'readKey', key: keyCfg(), rng: seeded(2) })
    expect(checkKey(q, q.keySig!)).toBe(true)
    const other = signatureByFifths(q.keySig!.fifths === 0 ? 1 : 0)
    expect(checkKey(q, other)).toBe(false)
  })
})

describe('helpers de módulo', () => {
  it('deriva tarefa e conjunto do id', () => {
    expect(taskOf('markNote:piano')).toBe('markNote')
    expect(taskOf('readKey')).toBe('readKey')
    expect(isNoteModule('readKey')).toBe(false)
  })
})
