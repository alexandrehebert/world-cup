import { useLocale } from '../../contexts/locale-context'
import { Icon } from '../../lib/icons'
import { LocaleSwitcher } from './locale-switcher'
import { ThemeToggle } from './theme-toggle'
import { FavoriteTeamsPicker } from './favorite-teams-picker'
import type { TournamentMeta } from '../../types/tournament'

export const Header = ({ meta }: { meta?: TournamentMeta }) => {
  const { locale, t } = useLocale()

  return (
    <div className="border-b border-[var(--border)] py-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col justify-center gap-2">
          <h1 className="inline-flex items-center gap-4 text-3xl font-extrabold leading-none tracking-[-0.04em] text-[var(--text-strong)] sm:text-4xl">
            <span aria-hidden="true" className="logo-soccer-wrap inline-flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
              <Icon name="sports_soccer" className="logo-soccer" />
            </span>
            <span>{t.appName}</span>
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            {meta
              ? `${meta.host} · ${meta.season} · ${new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(meta.updatedAt))}`
              : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FavoriteTeamsPicker />
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  )
}
