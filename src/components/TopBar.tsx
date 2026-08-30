import { Menu, Settings as SettingsIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TopBarProps {
  modeTitle: string
  onOpenSettings: () => void
  onToggleSidebar: () => void
}

export function TopBar({ modeTitle, onOpenSettings, onToggleSidebar }: TopBarProps) {
  const { t } = useTranslation()
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-surface/90 px-3 py-2 backdrop-blur"
      // desce abaixo da status bar no Android (--safe-area-inset-top vem do Capacitor;
      // 0 na web e na paisagem, onde a barra está escondida)
      style={{ paddingTop: 'calc(0.5rem + var(--safe-area-inset-top, env(safe-area-inset-top)))' }}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={t('topbar.aria.menu')}
        className="rounded-lg p-1.5 text-muted hover:bg-line hover:text-ink lg:hidden"
      >
        <Menu size={18} />
      </button>

      <span className="font-semibold tracking-tight text-ink">{t('app.name')}</span>
      <span className="hidden text-sm text-faint sm:inline">·</span>
      <span className="hidden truncate text-sm text-muted sm:inline">{modeTitle}</span>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label={t('topbar.aria.settings')}
        className="ml-auto rounded-lg p-1.5 text-muted hover:bg-line hover:text-ink"
      >
        <SettingsIcon size={18} />
      </button>
    </header>
  )
}
