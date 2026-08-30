import { KeySquare, Music2, MousePointerClick } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CLEF_SET_IDS } from '../core/clefSet'
import { NOTE_TASKS, type Module, type Task } from '../core/module'
import { setLanguage } from '../i18n'
import { cx } from '../lib/cx'

interface SidebarProps {
  module: Module
  onSelect: (m: Module) => void
  /** drawer aberto (apenas mobile) */
  open: boolean
  onClose: () => void
}

const TASK_ICON: Record<Task, typeof Music2> = {
  readNote: Music2,
  markNote: MousePointerClick,
  readKey: KeySquare,
}

/** O menu é derivado: uma seção por tarefa, um item por conjunto de claves. */
const GROUPS: { task: Task; items: { module: Module; labelKey: string }[] }[] = [
  ...NOTE_TASKS.map((task) => ({
    task: task as Task,
    items: CLEF_SET_IDS.map((set) => ({
      module: `${task}:${set}` as Module,
      labelKey: `clefSet.${set}`,
    })),
  })),
  { task: 'readKey', items: [{ module: 'readKey', labelKey: 'nav.item.readKey' }] },
]

function LangSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language === 'en' ? 'en' : 'pt'
  return (
    <div className="border-t border-line pt-3">
      <div className="flex gap-1 px-1">
        {(['pt', 'en'] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={cx(
              'rounded-md px-2.5 py-1 text-xs font-medium uppercase transition-colors',
              current === lang ? 'bg-accent-soft text-accent' : 'text-faint hover:text-ink',
            )}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

function Nav({ module, onSelect }: { module: Module; onSelect: (m: Module) => void }) {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((group) => {
        const Icon = TASK_ICON[group.task]
        return (
          <div key={group.task}>
            <h2 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-faint">
              {t(`nav.group.${group.task}`)}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = module === item.module
                return (
                  <li key={item.module}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.module)}
                      aria-current={active ? 'page' : undefined}
                      className={cx(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        active
                          ? 'bg-accent-soft font-medium text-accent'
                          : 'text-muted hover:bg-line hover:text-ink',
                      )}
                    >
                      <Icon size={16} className="shrink-0" />
                      {t(item.labelKey)}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      <LangSwitcher />
    </nav>
  )
}

export function Sidebar({ module, onSelect, open, onClose }: SidebarProps) {
  return (
    <>
      {/* coluna fixa em telas largas (desktop) */}
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-[49px] p-3">
          <Nav module={module} onSelect={onSelect} />
        </div>
      </aside>

      {/* drawer deslizante no mobile/tablet */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-surface px-3 py-3 shadow-xl">
            <Nav
              module={module}
              onSelect={(m) => {
                onSelect(m)
                onClose()
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
