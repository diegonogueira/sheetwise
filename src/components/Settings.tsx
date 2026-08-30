import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSettings, useModuleConfig } from '../store/settings'
import { Segmented } from './ui/Segmented'
import { C_CLEF_LINES } from '../core/clefSet'
import { isMarkNote, isNoteModule, usesCClef, type Module } from '../core/module'
import { CLEF_IDS, LEDGER_COUNTS, type LedgerCount } from '../core/clef'
import type { AccidentalMode, KeyAsk } from '../core/exercise'
import { cx } from '../lib/cx'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </div>
  )
}

function Section({ title, children, help }: { title: string; children: ReactNode; help: string }) {
  return (
    <div className="mt-2 border-t border-line pt-3">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">{title}</h3>
      {children}
      <p className="mt-2 text-xs text-faint">{help}</p>
    </div>
  )
}

/** Chip de seleção múltipla — o mesmo visual em toda config de lista. */
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
        on ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-accent hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

// derivado de LEDGER_COUNTS: mexer no limite do núcleo já reflete aqui
const LEDGER_OPTIONS = LEDGER_COUNTS.map((n) => ({ value: String(n), label: String(n) }))

/** Teto de acidentes da armadura — o mesmo nos módulos de nota e no de tonalidade. */
const KEY_MAX_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '4', label: '4' },
  { value: '7', label: '7' },
]

/** Config do módulo ativo: faixa lida e acidentes. */
function ModuleSettings({ module }: { module: Module }) {
  const { ledgerBelow, ledgerAbove, accidentalMode, keyMax, slotHints } = useModuleConfig(module)
  const setLedger = useSettings((s) => s.setLedger)
  const setAccidentalMode = useSettings((s) => s.setAccidentalMode)
  const setKeyMax = useSettings((s) => s.setKeyMax)
  const setSlotHints = useSettings((s) => s.setSlotHints)
  const { t } = useTranslation()

  return (
    <Section title={t('settings.moduleSection')} help={t('settings.moduleHelp')}>
      <div className="divide-y divide-line">
        <Row label={t('settings.ledgerBelow')}>
          <Segmented
            size="sm"
            value={String(ledgerBelow)}
            onChange={(v) => setLedger(module, 'below', Number(v) as LedgerCount)}
            options={LEDGER_OPTIONS}
          />
        </Row>
        <Row label={t('settings.ledgerAbove')}>
          <Segmented
            size="sm"
            value={String(ledgerAbove)}
            onChange={(v) => setLedger(module, 'above', Number(v) as LedgerCount)}
            options={LEDGER_OPTIONS}
          />
        </Row>
        <Row label={t('settings.accidentals')}>
          <Segmented
            size="sm"
            value={accidentalMode}
            onChange={(v) => setAccidentalMode(module, v as AccidentalMode)}
            options={[
              { value: 'none', label: t('settings.accidentalNone') },
              { value: 'note', label: t('settings.accidentalNote') },
              { value: 'key', label: t('settings.accidentalKey') },
            ]}
          />
        </Row>
        {/* o limite da armadura só faz sentido quando é ELA que altera a nota */}
        {accidentalMode === 'key' && (
          <Row label={t('settings.keyMax')}>
            <Segmented
              size="sm"
              value={String(keyMax)}
              onChange={(v) => setKeyMax(module, Number(v))}
              options={KEY_MAX_OPTIONS}
            />
          </Row>
        )}
        {/* a ajuda das letras só existe onde se CLICA na pauta; na leitura ela entregaria
            a resposta antes da pergunta */}
        {isMarkNote(module) && (
          <Row label={t('settings.slotHints')}>
            <Segmented
              size="sm"
              value={slotHints ? 'on' : 'off'}
              onChange={(v) => setSlotHints(module, v === 'on')}
              options={[
                { value: 'on', label: t('settings.yes') },
                { value: 'off', label: t('settings.no') },
              ]}
            />
          </Row>
        )}
      </div>
    </Section>
  )
}

/** Em que linhas a clave de Dó pode aparecer. */
function CClefSettings() {
  const lines = useSettings((s) => s.cClefLines)
  const toggle = useSettings((s) => s.toggleCClefLine)
  const { t } = useTranslation()

  return (
    <Section title={t('settings.cClefSection')} help={t('settings.cClefHelp')}>
      <span className="mb-2 block text-sm text-muted">{t('settings.cClefLabel')}</span>
      <div className="flex flex-wrap gap-1.5">
        {C_CLEF_LINES.map((line) => (
          <Chip key={line} on={lines.includes(line)} onClick={() => toggle(line)}>
            {t(`line.${line}`)}
          </Chip>
        ))}
      </div>
    </Section>
  )
}

/** Config do módulo de tonalidade. */
function KeySettings() {
  const ask = useSettings((s) => s.keyAsk)
  const setAsk = useSettings((s) => s.setKeyAsk)
  const max = useSettings((s) => s.keyMaxAccidentals)
  const setMax = useSettings((s) => s.setKeyMaxAccidentals)
  const clefs = useSettings((s) => s.keyClefs)
  const toggleClef = useSettings((s) => s.toggleKeyClef)
  const { t } = useTranslation()

  return (
    <Section title={t('settings.keySection')} help={t('settings.keyHelp')}>
      <div className="divide-y divide-line">
        <Row label={t('settings.keyAsk')}>
          <Segmented
            size="sm"
            value={ask}
            onChange={(v) => setAsk(v as KeyAsk)}
            options={[
              { value: 'major', label: t('settings.keyAskMajor') },
              { value: 'minor', label: t('settings.keyAskMinor') },
              { value: 'both', label: t('settings.keyAskBoth') },
            ]}
          />
        </Row>
        <Row label={t('settings.keyMax')}>
          <Segmented
            size="sm"
            value={String(max)}
            onChange={(v) => setMax(Number(v))}
            options={KEY_MAX_OPTIONS}
          />
        </Row>
      </div>

      <div className="py-3">
        <span className="mb-2 block text-sm text-muted">{t('settings.keyClefs')}</span>
        <div className="flex flex-wrap gap-1.5">
          {CLEF_IDS.map((clef) => (
            <Chip key={clef} on={clefs.includes(clef)} onClick={() => toggleClef(clef)}>
              {t(`clef.${clef}`)}
            </Chip>
          ))}
        </div>
      </div>
    </Section>
  )
}

export function SettingsPanel({ module, onClose }: { module: Module; onClose: () => void }) {
  const naming = useSettings((s) => s.naming)
  const setNaming = useSettings((s) => s.setNaming)
  const audioEnabled = useSettings((s) => s.audioEnabled)
  const setAudioEnabled = useSettings((s) => s.setAudioEnabled)
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('settings.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('settings.aria.close')}
            className="rounded-lg p-1.5 text-muted hover:bg-line hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="divide-y divide-line">
          <Row label={t('settings.naming')}>
            <Segmented
              size="sm"
              value={naming}
              onChange={setNaming}
              options={[
                { value: 'letters', label: t('settings.namingLetters') },
                { value: 'solfege', label: t('settings.namingSolfege') },
              ]}
            />
          </Row>
          <Row label={t('settings.audio')}>
            <Segmented
              size="sm"
              value={audioEnabled ? 'on' : 'off'}
              onChange={(v) => setAudioEnabled(v === 'on')}
              options={[
                { value: 'on', label: t('settings.audioOn') },
                { value: 'off', label: t('settings.audioOff') },
              ]}
            />
          </Row>
        </div>

        {isNoteModule(module) && <ModuleSettings module={module} />}
        {usesCClef(module) && <CClefSettings />}
        {module === 'readKey' && <KeySettings />}
      </div>
    </div>
  )
}
