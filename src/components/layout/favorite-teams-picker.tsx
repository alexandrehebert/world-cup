import { useEffect, useMemo, useRef, useState } from 'react'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { useTournament } from '../../contexts/tournament-context'
import { Icon } from '../../lib/icons'

export const FavoriteTeamsPicker = () => {
  const { t } = useLocale()
  const { teams } = useTournament()
  const { favoriteTeamIds, toggleFavoriteTeam, clearFavoriteTeams } = useDashboard()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const favoriteSet = useMemo(() => new Set(favoriteTeamIds), [favoriteTeamIds])
  const footerButtonClassName = 'inline-flex h-10 items-center justify-center gap-1 border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40'

  const sortedTeams = useMemo(() => {
    return [...teams].sort((first, second) => {
      return (t.teams[first.id] ?? first.name).localeCompare(t.teams[second.id] ?? second.name)
    })
  }, [t, teams])

  const filteredTeams = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase()

    if (!trimmedQuery) {
      return sortedTeams
    }

    return sortedTeams.filter((team) => {
      const teamName = (t.teams[team.id] ?? team.name).toLowerCase()
      return teamName.includes(trimmedQuery) || team.code.toLowerCase().includes(trimmedQuery)
    })
  }, [t, query, sortedTeams])

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
    <div ref={pickerRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-10 w-full cursor-pointer items-center gap-2 border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)] sm:w-auto"
      >
        <Icon name="star" className="text-[18px] text-[var(--accent-text)]" />
        <span>{t.labels.favoriteTeams}</span>
        <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
          {favoriteTeamIds.length} {t.labels.favoritesCount}
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(24rem,calc(100vw-2rem))] space-y-3 border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-lg sm:left-auto sm:right-0">
          <div className="space-y-2 border-b border-[var(--border)] pb-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--text-strong)]">{t.labels.favoriteTeams}</p>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                {favoriteTeamIds.length} {t.labels.favoritesCount}
              </span>
            </div>
            <p className="text-xs text-[var(--text-soft)]">{t.labels.favoriteTeamsHint}</p>
            <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
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
                    className={`flex w-full cursor-pointer items-center justify-between border border-transparent px-2.5 py-2 text-left text-sm font-medium transition ${
                      selected
                        ? 'border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent-text)]'
                        : 'text-[var(--text)] hover:border-[var(--border)] hover:bg-[var(--surface-soft)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-7 shrink-0 overflow-hidden rounded-[4px] border border-[var(--border)]" aria-hidden="true">
                        <span className={`fi fi-${team.flagCode} flag-avatar-fill block h-full w-full`} />
                      </span>
                      <span>{t.teams[team.id] ?? team.name}</span>
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

          <div>
            <div className="flex items-center">
            <button
              type="button"
              onClick={clearFavoriteTeams}
              disabled={favoriteTeamIds.length === 0}
              className={`w-full ${footerButtonClassName}`}
            >
              <Icon name="delete" className="text-[16px]" />
              <span>{t.labels.clearFavorites}</span>
            </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
