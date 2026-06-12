import { useEffect, useMemo, useRef, useState } from 'react'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { useTournament } from '../../contexts/tournament-context'
import { getLocalizedText } from '../../lib/format'
import { Icon } from '../../lib/icons'

export const FavoriteTeamsPicker = () => {
  const { locale, t } = useLocale()
  const { teams } = useTournament()
  const { favoriteTeamIds, toggleFavoriteTeam, clearFavoriteTeams } = useDashboard()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const favoriteSet = useMemo(() => new Set(favoriteTeamIds), [favoriteTeamIds])

  const sortedTeams = useMemo(() => {
    return [...teams].sort((first, second) => {
      return getLocalizedText(first.name, locale).localeCompare(getLocalizedText(second.name, locale))
    })
  }, [locale, teams])

  const filteredTeams = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase()

    if (!trimmedQuery) {
      return sortedTeams
    }

    return sortedTeams.filter((team) => {
      const teamName = getLocalizedText(team.name, locale).toLowerCase()
      return teamName.includes(trimmedQuery) || team.code.toLowerCase().includes(trimmedQuery)
    })
  }, [locale, query, sortedTeams])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-10 cursor-pointer items-center gap-2 border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
      >
        <Icon name="star" className="text-[18px] text-[var(--accent-text)]" />
        <span>{t.labels.favoriteTeams}</span>
        <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
          {favoriteTeamIds.length} {t.labels.favoritesCount}
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(24rem,calc(100vw-2rem))] border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-lg sm:left-auto sm:right-0">
          <div className="space-y-2 border-b border-[var(--border)] pb-3">
            <p className="text-sm font-semibold text-[var(--text-strong)]">{t.labels.favoriteTeams}</p>
            <p className="text-xs text-[var(--text-soft)]">{t.labels.favoriteTeamsHint}</p>
            <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
              <Icon name="search" className="text-[16px] text-[var(--text-soft)]" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.labels.searchTeamsPlaceholder}
                className="w-full bg-transparent text-sm text-[var(--text-strong)] outline-none"
              />
            </div>
          </div>

          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
            {filteredTeams.length > 0 ? (
              filteredTeams.map((team) => {
                const selected = favoriteSet.has(team.id)

                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleFavoriteTeam(team.id)}
                    className={`flex w-full cursor-pointer items-center justify-between px-2 py-2 text-left text-sm transition ${
                      selected
                        ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]'
                        : 'text-[var(--text)] hover:bg-[var(--surface-soft)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`fi fi-${team.flagCode} inline-block h-6 w-6 shrink-0 rounded-full bg-center bg-cover`} aria-hidden="true" />
                      <span>{getLocalizedText(team.name, locale)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      <span>{team.code}</span>
                      {selected ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                    </span>
                  </button>
                )
              })
            ) : (
              <p className="px-2 py-2 text-sm text-[var(--text-muted)]">{t.labels.noFavoriteSearchResults}</p>
            )}
          </div>

          <div className="mt-3 border-t border-[var(--border)] pt-3">
            <button
              type="button"
              onClick={clearFavoriteTeams}
              disabled={favoriteTeamIds.length === 0}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)] transition hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="close" className="text-[14px]" />
              <span>{t.labels.clearFavorites}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
