import { useLocale } from '../../contexts/locale-context'
import { Icon } from '../../lib/icons'
import { LocaleSwitcher } from './locale-switcher'
import { ThemeToggle } from './theme-toggle'
import { FavoriteTeamsPicker } from './favorite-teams-picker'
import type { TournamentMeta } from '../../types/tournament'

export const Header = ({ meta, isCompact = false }: { meta?: TournamentMeta; isCompact?: boolean }) => {
  const { locale, t } = useLocale()

  return (
    <div className={`transition-all duration-200 ${isCompact ? 'pt-2 pb-1' : 'pt-5 pb-2'}`}>
      <div className={`flex flex-col transition-all duration-200 lg:flex-row lg:items-center lg:justify-between ${isCompact ? 'gap-2' : 'gap-5'}`}>
        <div className="flex flex-col justify-center gap-2">
          <h1 className={`inline-flex items-center font-extrabold leading-none tracking-[-0.04em] text-[var(--text-strong)] transition-all duration-200 ${
            isCompact ? 'gap-2 text-2xl sm:text-3xl' : 'gap-4 text-3xl sm:text-4xl'
          }`}>
            <span aria-hidden="true" className={`logo-soccer-wrap inline-flex shrink-0 items-center justify-center transition-all duration-200 ${
              isCompact ? 'h-9 w-9 sm:h-10 sm:w-10' : 'h-12 w-12 sm:h-14 sm:w-14'
            }`}>
              <Icon name="sports_soccer" className="logo-soccer" />
            </span>
            <span>{t.appName}</span>
          </h1>
          <p className={`max-w-3xl overflow-hidden text-[var(--text-muted)] transition-all duration-200 ${
            isCompact ? 'max-h-0 opacity-0' : 'max-h-16 text-sm leading-6 opacity-100 sm:text-base'
          }`}>
            {meta
              ? `${meta.host} · ${meta.season} · ${new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(meta.updatedAt))}`
              : ''}
          </p>
        </div>

        <div className={`flex flex-wrap items-center transition-all duration-200 ${isCompact ? 'gap-2' : 'gap-3'}`}>
          <FavoriteTeamsPicker />
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  )
}
