import { useTheme } from '../../contexts/theme-context'
import { useLocale } from '../../contexts/locale-context'
import { Icon } from '../../lib/icons'

export const ThemeToggle = () => {
  const { setThemePreference, themePreference } = useTheme()
  const { t } = useLocale()
  const themeOptions = [
    { value: 'light', label: t.labels.lightTheme, icon: 'light_mode' },
    { value: 'dark', label: t.labels.darkTheme, icon: 'dark_mode' },
    { value: 'colorblind', label: t.labels.colorblindTheme, icon: 'visibility' },
  ] as const

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      aria-label="Theme switcher"
      role="group"
    >
      {themeOptions.map((option) => {
        const isActive = themePreference === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setThemePreference(option.value)}
            className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-muted)]/40 ${
              isActive
                ? 'border border-[var(--tab-active-border)] bg-[var(--tab-active-bg)] text-[var(--tab-active-text)]'
                : 'border border-transparent text-[var(--text-muted)] hover:bg-[var(--tab-idle-hover-bg)] hover:text-[var(--text)]'
            }`}
            aria-pressed={isActive}
            aria-label={`${option.label} theme`}
            title={`${option.label} theme`}
          >
            <Icon name={option.icon} className="text-[16px]" />
          </button>
        )
      })}
    </div>
  )
}
