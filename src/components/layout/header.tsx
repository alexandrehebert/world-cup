import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { useLocale } from '../../contexts/locale-context'
import { Icon } from '../../lib/icons'
import { LocaleSwitcher } from './locale-switcher'
import { ThemeToggle } from './theme-toggle'
import { FavoriteTeamsPicker } from './favorite-teams-picker'
import type { TournamentMeta } from '../../types/tournament'

const getUserInitial = (username: string) => username.trim().charAt(0).toUpperCase() || 'U'

export const Header = ({ meta, isCompact = false }: { meta?: TournamentMeta; isCompact?: boolean }) => {
  const { locale, t } = useLocale()
  const { user, logout, openAuthModal } = useAuth()
  const [isMobileAccountMenuOpen, setIsMobileAccountMenuOpen] = useState(false)
  const [isMobileSettingsMenuOpen, setIsMobileSettingsMenuOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false)
  const mobileAccountMenuRef = useRef<HTMLDivElement>(null)
  const mobileSettingsMenuRef = useRef<HTMLDivElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!mobileAccountMenuRef.current?.contains(event.target as Node)) {
        setIsMobileAccountMenuOpen(false)
      }

      if (!mobileSettingsMenuRef.current?.contains(event.target as Node)) {
        setIsMobileSettingsMenuOpen(false)
      }

      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false)
      }

      if (!settingsMenuRef.current?.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileAccountMenuOpen(false)
        setIsMobileSettingsMenuOpen(false)
        setIsAccountMenuOpen(false)
        setIsSettingsMenuOpen(false)
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

        <div className={`flex w-full items-center transition-all duration-200 lg:w-auto ${isCompact ? 'gap-2' : 'gap-3'}`}>
          <div className="min-w-0 flex-1 lg:flex-none">
            <FavoriteTeamsPicker />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <div ref={mobileSettingsMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMobileSettingsMenuOpen((current) => !current)
                  setIsMobileAccountMenuOpen(false)
                }}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                aria-label={locale === 'fr' ? 'Paramètres' : 'Settings'}
                aria-expanded={isMobileSettingsMenuOpen}
                aria-controls="mobile-settings-menu"
              >
                <Icon name={isMobileSettingsMenuOpen ? 'close' : 'settings'} className="text-[20px]" />
              </button>

              {isMobileSettingsMenuOpen ? (
                <div
                  id="mobile-settings-menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-xl"
                >
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{t.labels.theme}</p>
                  <ThemeToggle />
                  <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{t.labels.language}</p>
                  <LocaleSwitcher />
                </div>
              ) : null}
            </div>

            <div ref={mobileAccountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMobileAccountMenuOpen((current) => !current)
                  setIsMobileSettingsMenuOpen(false)
                }}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                aria-label={user ? (locale === 'fr' ? 'Compte' : 'Account') : (locale === 'fr' ? 'Connexion' : 'Sign in')}
                aria-expanded={isMobileAccountMenuOpen}
                aria-controls="mobile-account-menu"
              >
                {user ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-semibold text-[var(--accent-text)]">
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
                  {user ? (
                    <div className="space-y-2">
                      <div className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-semibold text-[var(--accent-text)]">
                          {getUserInitial(user.username)}
                        </span>
                        <p className="truncate text-sm font-semibold text-[var(--text-strong)]">{user.username}</p>
                      </div>
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
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileAccountMenuOpen(false)
                          openAuthModal('login')
                        }}
                        className="bg-[var(--accent-muted)] px-2 py-2 text-xs font-semibold text-[var(--accent-text)]"
                      >
                        {t.labels.signIn}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileAccountMenuOpen(false)
                          openAuthModal('register')
                        }}
                        className="bg-[var(--surface-soft)] px-2 py-2 text-xs font-semibold text-[var(--text)]"
                      >
                        {t.labels.createAccount}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="hidden lg:inline-flex lg:items-center lg:gap-3">
            <div ref={settingsMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsMenuOpen((current) => !current)
                  setIsAccountMenuOpen(false)
                }}
                aria-expanded={isSettingsMenuOpen}
                aria-controls="desktop-settings-menu"
                className="inline-flex cursor-pointer items-center gap-2 border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-2 text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
              >
                <Icon name="settings" className="text-[18px]" />
                <span className="text-sm font-medium">{locale === 'fr' ? 'Paramètres' : 'Settings'}</span>
                <Icon name={isSettingsMenuOpen ? 'expand_less' : 'expand_more'} className="text-[18px] text-[var(--text-soft)]" />
              </button>

              {isSettingsMenuOpen ? (
                <div
                  id="desktop-settings-menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-64 space-y-2 border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-xl"
                >
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{t.labels.theme}</p>
                  <ThemeToggle />
                  <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{t.labels.language}</p>
                  <LocaleSwitcher />
                </div>
              ) : null}
            </div>

            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsAccountMenuOpen((current) => !current)
                  setIsSettingsMenuOpen(false)
                }}
                aria-expanded={isAccountMenuOpen}
                aria-controls="desktop-account-menu"
                className="inline-flex cursor-pointer items-center gap-2 border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
              >
                {user ? (
                  <>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-muted)] text-xs font-semibold text-[var(--accent-text)]">
                      {getUserInitial(user.username)}
                    </span>
                    <span className="max-w-[10rem] truncate text-sm font-medium">{user.username}</span>
                  </>
                ) : (
                  <>
                    <Icon name="person" className="text-[18px]" />
                    <span className="text-sm font-medium">{locale === 'fr' ? 'Compte' : 'Account'}</span>
                  </>
                )}
                <Icon name={isAccountMenuOpen ? 'expand_less' : 'expand_more'} className="text-[18px] text-[var(--text-soft)]" />
              </button>

              {isAccountMenuOpen ? (
                <div
                  id="desktop-account-menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-64 space-y-3 border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-xl"
                >
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
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false)
                          openAuthModal('login')
                        }}
                        className="bg-[var(--accent-muted)] px-3 py-2 text-sm font-semibold text-[var(--accent-text)]"
                      >
                        {t.labels.signIn}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false)
                          openAuthModal('register')
                        }}
                        className="bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--text)]"
                      >
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
