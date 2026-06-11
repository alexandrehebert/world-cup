import { useLocale } from '../../contexts/locale-context'

export const LocaleSwitcher = () => {
  const { locale, setLocale } = useLocale()
  const locales = [
    { code: 'en', label: 'English', flagCode: 'gb' },
    { code: 'fr', label: 'Français', flagCode: 'fr' },
  ] as const

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      aria-label="Language switcher"
      role="group"
    >
      {locales.map((option) => {
        const isActive = locale === option.code

        return (
          <button
            key={option.code}
            type="button"
            onClick={() => setLocale(option.code)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-muted)]/40 ${
              isActive
                ? 'border border-[var(--tab-active-border)] bg-[var(--tab-active-bg)] text-[var(--tab-active-text)]'
                : 'border border-transparent text-[var(--text-muted)] hover:bg-[var(--tab-idle-hover-bg)] hover:text-[var(--text)]'
            }`}
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.label}
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] ${
                isActive ? '' : 'opacity-85'
              }`}
              aria-hidden="true"
            >
              <span className={`fi fi-${option.flagCode} flag-avatar-fill block h-full w-full`} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
