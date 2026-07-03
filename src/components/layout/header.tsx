import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'
import { useLocale } from '../../contexts/locale-context'
import { useTimeZone } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { Icon } from '../../lib/icons'
import { isPredictionsFeatureEnabled } from '../../lib/features'
import { CompetitionSwitcher } from './competition-switcher'
import { LocaleSwitcher } from './locale-switcher'
import { ThemeToggle } from './theme-toggle'
import { FavoriteTeamsPicker } from './favorite-teams-picker'
import type { TournamentMeta } from '../../types/tournament'

const getUserInitial = (username: string) => username.trim().charAt(0).toUpperCase() || 'U'

export const Header = ({ meta, isCompact = false }: { meta?: TournamentMeta; isCompact?: boolean }) => {
  const { locale, t } = useLocale()
  const tournament = useTournament()
  const effectiveMeta = meta ?? tournament.meta
  const timeZone = useTimeZone()
  const { user, logout, openAuthModal } = useAuth()
  const logoIconName = effectiveMeta?.competitionId === 'nations-championship-2026' ? 'sports_rugby' : 'sports_soccer'
  const [isMobileAccountMenuOpen, setIsMobileAccountMenuOpen] = useState(false)
  const [isMobileCompetitionMenuOpen, setIsMobileCompetitionMenuOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isCompetitionMenuOpen, setIsCompetitionMenuOpen] = useState(false)
  const mobileAccountMenuRef = useRef<HTMLDivElement>(null)
  const mobileCompetitionMenuRef = useRef<HTMLDivElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const competitionMenuRef = useRef<HTMLDivElement>(null)
  const desktopMenuTriggerClassName = 'inline-flex h-10 cursor-pointer items-center border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]'

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!mobileAccountMenuRef.current?.contains(event.target as Node)) {
        setIsMobileAccountMenuOpen(false)
      }

      if (!mobileCompetitionMenuRef.current?.contains(event.target as Node)) {
        setIsMobileCompetitionMenuOpen(false)
      }

      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false)
      }

      if (!competitionMenuRef.current?.contains(event.target as Node)) {
        setIsCompetitionMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileAccountMenuOpen(false)
        setIsMobileCompetitionMenuOpen(false)
        setIsAccountMenuOpen(false)
        setIsCompetitionMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div className={`transition-all duration-200 ${isCompact ? 'pt-2 pb-1' : 'pt-5 pb-2'}`}>
      <div className={`flex flex-col transition-all duration-200 lg:flex-row lg:items-center lg:justify-between ${isCompact ? 'gap-2' : 'gap-5'}`}>
        <div className="flex flex-col justify-center gap-2">
          <h1>
            <Link
              to="/overview"
              aria-label={locale === 'fr' ? "Aller à l'aperçu" : 'Go to overview'}
              className={`inline-flex items-center font-extrabold leading-none tracking-[-0.04em] text-[var(--text-strong)] transition-all duration-200 ${
                isCompact ? 'gap-2 text-2xl sm:text-3xl' : 'gap-4 text-3xl sm:text-4xl'
              }`}
            >
              <span aria-hidden="true" className={`logo-soccer-wrap inline-flex shrink-0 items-center justify-center transition-all duration-200 ${
                isCompact ? 'h-9 w-9 sm:h-10 sm:w-10' : 'h-12 w-12 sm:h-14 sm:w-14'
              }`}>
                <Icon name={logoIconName} className="logo-soccer" />
              </span>
              <span>{effectiveMeta?.edition || t.appName}</span>
            </Link>
          </h1>
          <p className={`max-w-3xl overflow-hidden text-[var(--text-muted)] transition-all duration-200 ${
            isCompact ? 'max-h-0 opacity-0' : 'max-h-16 text-sm leading-6 opacity-100 sm:text-base'
          }`}>
            {effectiveMeta
              ? `${effectiveMeta.host} · ${effectiveMeta.season} · ${new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone,
                }).format(new Date(effectiveMeta.updatedAt))}`
              : ''}
          </p>
        </div>

        <div className={`flex w-full items-center transition-all duration-200 lg:w-auto ${isCompact ? 'gap-2' : 'gap-3'}`}>
          <div className="min-w-0 flex-1 lg:flex-none">
            <FavoriteTeamsPicker />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <div ref={mobileCompetitionMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMobileCompetitionMenuOpen((current) => !current)
                  setIsMobileAccountMenuOpen(false)
                }}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                aria-label={t.labels.competition}
                aria-expanded={isMobileCompetitionMenuOpen}
                aria-controls="mobile-competition-menu"
              >
                <Icon name={isMobileCompetitionMenuOpen ? 'close' : 'emoji_events'} className="text-[20px]" />
              </button>

              {isMobileCompetitionMenuOpen ? (
                <div
                  id="mobile-competition-menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-xl"
                >
                  <CompetitionSwitcher activeCompetitionId={effectiveMeta?.competitionId} />
                </div>
              ) : null}
            </div>

            <div ref={mobileAccountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMobileAccountMenuOpen((current) => !current)
                  setIsMobileCompetitionMenuOpen(false)
                }}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                aria-label={user ? (locale === 'fr' ? 'Compte' : 'Account') : (locale === 'fr' ? 'Connexion' : 'Sign in')}
                aria-expanded={isMobileAccountMenuOpen}
                aria-controls="mobile-account-menu"
              >
                {user ? (
                  <span className="inline-flex h-full w-full items-center justify-center rounded-none bg-[var(--accent-muted)] text-sm font-semibold text-[var(--accent-text)]">
                    {getUserInitial(user.username)}
                  </span>
                ) : (
                  <Icon name={isMobileAccountMenuOpen ? 'close' : 'person'} className="text-[20px]" />
                )}
              </button>

              {isMobileAccountMenuOpen ? (
                <div
                  id="mobile-account-menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-xl"
                >
                  <div className="space-y-2">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{t.labels.theme}</p>
                    <ThemeToggle />
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{t.labels.language}</p>
                    <LocaleSwitcher />
                  </div>
                  <div className="h-px bg-[var(--border)]" />
                  {user ? (
                    <div className="space-y-2">
                      <div className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-semibold text-[var(--accent-text)]">
                          {getUserInitial(user.username)}
                        </span>
                        <p className="truncate text-sm font-semibold text-[var(--text-strong)]">{user.username}</p>
                      </div>
                      {isPredictionsFeatureEnabled ? (
                        <Link
                          to={`/profile/${encodeURIComponent(user.username)}`}
                          onClick={() => setIsMobileAccountMenuOpen(false)}
                          className="block w-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-left text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
                        >
                          {t.labels.myProfile}
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileAccountMenuOpen(false)
                          void logout()
                        }}
                        className="w-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-left text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
                      >
                        {t.labels.logout}
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileAccountMenuOpen(false)
                          openAuthModal('login')
                        }}
                        className="inline-flex w-full items-center gap-2 bg-[var(--accent-muted)] px-3 py-2 text-left text-xs font-semibold text-[var(--accent-text)]"
                      >
                        <Icon name="login" className="text-[16px]" />
                        {t.labels.signIn}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileAccountMenuOpen(false)
                          openAuthModal('register')
                        }}
                        className="inline-flex w-full items-center gap-2 bg-[var(--surface-soft)] px-3 py-2 text-left text-xs font-semibold text-[var(--text)]"
                      >
                        <Icon name="person_add" className="text-[16px]" />
                        {t.labels.createAccount}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="hidden lg:inline-flex lg:items-center lg:gap-3">
            <div ref={competitionMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsCompetitionMenuOpen((current) => !current)
                  setIsAccountMenuOpen(false)
                }}
                aria-expanded={isCompetitionMenuOpen}
                aria-controls="desktop-competition-menu"
                className={`${desktopMenuTriggerClassName} gap-2 px-3`}
              >
                <Icon name="emoji_events" className="text-[18px]" />
                <span>{t.labels.competition}</span>
                <Icon name={isCompetitionMenuOpen ? 'expand_less' : 'expand_more'} className="text-[18px] text-[var(--text-soft)]" />
              </button>

              {isCompetitionMenuOpen ? (
                <div
                  id="desktop-competition-menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-64 space-y-2 border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-xl"
                >
                  <CompetitionSwitcher activeCompetitionId={effectiveMeta?.competitionId} />
                </div>
              ) : null}
            </div>

            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsAccountMenuOpen((current) => !current)
                  setIsCompetitionMenuOpen(false)
                }}
                aria-expanded={isAccountMenuOpen}
                aria-controls="desktop-account-menu"
                className={`${desktopMenuTriggerClassName} ${
                  user ? 'gap-0 py-0 pl-0 pr-2.5' : 'gap-2 px-3'
                }`}
              >
                {user ? (
                  <>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-none border-r border-[var(--border)] bg-[var(--accent-muted)] text-sm font-semibold text-[var(--accent-text)]">
                      {getUserInitial(user.username)}
                    </span>
                    <span className="max-w-[10rem] truncate px-2 font-semibold">{user.username}</span>
                  </>
                ) : (
                  <>
                    <Icon name="person" className="text-[18px]" />
                    <span>{locale === 'fr' ? 'Compte' : 'Account'}</span>
                  </>
                )}
                <Icon name={isAccountMenuOpen ? 'expand_less' : 'expand_more'} className="text-[18px] text-[var(--text-soft)]" />
              </button>

              {isAccountMenuOpen ? (
                <div
                  id="desktop-account-menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-64 space-y-3 border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-xl"
                >
                  <div className="space-y-2">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{t.labels.theme}</p>
                    <ThemeToggle />
                    <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{t.labels.language}</p>
                    <LocaleSwitcher />
                  </div>
                  <div className="h-px bg-[var(--border)]" />
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-semibold text-[var(--accent-text)]">
                          {getUserInitial(user.username)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-strong)]">{user.username}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {locale === 'fr' ? 'Connecté' : 'Signed in'}
                          </p>
                        </div>
                      </div>
                      {isPredictionsFeatureEnabled ? (
                        <Link
                          to={`/profile/${encodeURIComponent(user.username)}`}
                          onClick={() => setIsAccountMenuOpen(false)}
                          className="block w-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
                        >
                          {t.labels.myProfile}
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false)
                          void logout()
                        }}
                        className="w-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
                      >
                        {t.labels.logout}
                      </button>
                    </>
                  ) : (
                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false)
                          openAuthModal('login')
                        }}
                        className="inline-flex w-full items-center gap-2 bg-[var(--accent-muted)] px-3 py-2 text-sm font-semibold text-[var(--accent-text)]"
                      >
                        <Icon name="login" className="text-[18px]" />
                        {t.labels.signIn}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false)
                          openAuthModal('register')
                        }}
                        className="inline-flex w-full items-center gap-2 bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--text)]"
                      >
                        <Icon name="person_add" className="text-[18px]" />
                        {t.labels.createAccount}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
