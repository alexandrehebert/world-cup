import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '../contexts/locale-context'
import { useTournament } from '../contexts/tournament-context'
import { BracketBoard } from '../components/bracket/bracket-board'
import { Icon } from '../lib/icons'
import { getTopTeamFromPlaceholder } from '../lib/bracket'

type BracketViewMode = 'detailed' | 'condensed'

export const BracketPage = () => {
  const { t } = useLocale()
  const { bracketRounds, teams, matchesById, groupsById } = useTournament()
  const [forecastTeamId, setForecastTeamId] = useState<string>('')
  const [viewMode, setViewMode] = useState<BracketViewMode>('detailed')
  const [teamQuery, setTeamQuery] = useState('')
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false)
  const teamFilterRef = useRef<HTMLDivElement>(null)
  const teamInputRef = useRef<HTMLInputElement>(null)
  const knockoutAutocompleteTeams = useMemo(() => {
    const roundOf32 = bracketRounds.find((round) => round.id === 'roundOf32')
    const groupsByIdMap = new Map(Object.entries(groupsById))
    const teamIds = new Set<string>()

    for (const matchId of roundOf32?.matchIds ?? []) {
      const match = matchesById[matchId]
      if (!match) continue

      const homeProjectedId = match.home.teamId
        ?? (match.home.placeholder ? getTopTeamFromPlaceholder(match.home.placeholder, groupsByIdMap) : undefined)
      const awayProjectedId = match.away.teamId
        ?? (match.away.placeholder ? getTopTeamFromPlaceholder(match.away.placeholder, groupsByIdMap) : undefined)

      if (homeProjectedId) teamIds.add(homeProjectedId)
      if (awayProjectedId) teamIds.add(awayProjectedId)
    }

    const filteredTeams = teams.filter((team) => teamIds.has(team.id))
    if (filteredTeams.length > 0) {
      return filteredTeams
    }

    return teams
  }, [bracketRounds, teams, matchesById, groupsById])
  const sortedTeams = useMemo(
    () =>
      [...knockoutAutocompleteTeams].sort((first, second) =>
        (t.teams[first.id] ?? first.name).localeCompare(t.teams[second.id] ?? second.name),
      ),
    [t, knockoutAutocompleteTeams],
  )
  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === forecastTeamId),
    [teams, forecastTeamId],
  )
  const teamSearchResults = useMemo(() => {
    const trimmedQuery = teamQuery.trim().toLowerCase()

    if (!trimmedQuery) {
      return sortedTeams
    }

    return sortedTeams.filter((team) => {
      const teamLabel = (t.teams[team.id] ?? team.name).toLowerCase()
      return teamLabel.includes(trimmedQuery) || team.code.toLowerCase().includes(trimmedQuery)
    })
  }, [sortedTeams, t, teamQuery])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!teamFilterRef.current?.contains(event.target as Node)) {
        setIsTeamMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  return (
    <section className="space-y-4 pb-4" suppressHydrationWarning>
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.bracket}</h2>
      </div>
      <div className="space-y-3 lg:space-y-0">
        <div className="flex items-center gap-2">
          <div ref={teamFilterRef} className="relative z-20 min-w-0 flex-1">
            <div
              className="flex min-h-10 w-full flex-wrap items-center gap-2 border border-[var(--border)] bg-[var(--surface)] pl-3 pr-10 transition focus-within:border-[var(--accent-border)]"
              role="combobox"
              aria-expanded={isTeamMenuOpen}
              aria-label={t.labels.bracketPathTeam}
              onClick={() => {
                setIsTeamMenuOpen(true)
                teamInputRef.current?.focus()
              }}
            >
              <Icon name="search" className="text-[18px] leading-none text-[var(--text-soft)]" />

              {selectedTeam ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setForecastTeamId('')
                    teamInputRef.current?.focus()
                  }}
                  className="inline-flex items-center gap-1.5 border border-[var(--accent-border)] bg-[var(--accent-muted)] px-1.5 py-0.5 text-xs text-[var(--accent-text)]"
                  title={t.teams[selectedTeam.id] ?? selectedTeam.name}
                >
                  <span className={`fi fi-${selectedTeam.flagCode} inline-block h-4 w-4 shrink-0 rounded-full bg-center bg-cover`} aria-hidden="true" />
                  <span>{t.teams[selectedTeam.id] ?? selectedTeam.name}</span>
                  <Icon name="close" className="block text-[14px] leading-none text-[var(--text-muted)]" />
                </button>
              ) : null}

              <input
                ref={teamInputRef}
                type="text"
                value={teamQuery}
                placeholder={selectedTeam ? '' : t.labels.bracketPathSearchPlaceholder}
                onFocus={() => setIsTeamMenuOpen(true)}
                onChange={(event) => {
                  setTeamQuery(event.target.value)
                  setIsTeamMenuOpen(true)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setIsTeamMenuOpen(false)
                  }

                  if (event.key === 'Enter' && teamSearchResults.length > 0) {
                    event.preventDefault()
                    const firstResult = teamSearchResults[0]
                    setForecastTeamId(firstResult.id)
                    setTeamQuery('')
                    setIsTeamMenuOpen(false)
                  }

                  if (event.key === 'Backspace' && !teamQuery && selectedTeam) {
                    setForecastTeamId('')
                  }
                }}
                className="min-w-[8rem] flex-1 bg-transparent text-sm text-[var(--text-strong)] outline-none"
              />

              {(forecastTeamId.length > 0 || teamQuery.length > 0) && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setForecastTeamId('')
                    setTeamQuery('')
                    teamInputRef.current?.focus()
                  }}
                  aria-label={t.labels.clearBracketPath}
                  title={t.labels.clearBracketPath}
                  className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center text-[var(--text-muted)] transition hover:text-[var(--text-strong)]"
                >
                  <Icon name="close" className="block text-[18px] leading-none" />
                </button>
              )}
            </div>

            {isTeamMenuOpen ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[70] max-h-64 overflow-y-auto border border-[var(--border)] bg-[var(--surface-strong)] p-2">
                {teamSearchResults.length > 0 ? (
                  <div className="grid gap-1">
                    {teamSearchResults.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => {
                          setForecastTeamId(team.id)
                          setTeamQuery('')
                          setIsTeamMenuOpen(false)
                        }}
                        className={`flex w-full items-center justify-between px-2 py-2 text-left text-sm transition ${
                          forecastTeamId === team.id
                            ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]'
                            : 'text-[var(--text)] hover:bg-[var(--surface-soft)]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`fi fi-${team.flagCode} inline-block h-6 w-6 shrink-0 rounded-full bg-center bg-cover`} aria-hidden="true" />
                          <span>{t.teams[team.id] ?? team.name}</span>
                        </span>
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">{team.code}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 py-2 text-sm text-[var(--text-muted)]">{t.labels.noFavoriteSearchResults}</p>
                )}
              </div>
            ) : null}
          </div>

          <div
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-soft)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            aria-label={t.labels.bracketViewMode}
            role="group"
          >
            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center px-0 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-muted)]/40 sm:h-8 sm:w-auto sm:px-3 ${
                viewMode === 'detailed'
                  ? 'border border-[var(--tab-active-border)] bg-[var(--tab-active-bg)] text-[var(--tab-active-text)]'
                  : 'border border-transparent text-[var(--text-muted)] hover:bg-[var(--tab-idle-hover-bg)] hover:text-[var(--text)]'
              }`}
              aria-pressed={viewMode === 'detailed'}
              aria-label={t.labels.bracketViewDetailed}
            >
              <Icon name="view_column" className="text-[14px] sm:mr-1" />
              <span className="hidden sm:inline">{t.labels.bracketViewDetailed}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('condensed')}
              className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center px-0 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-muted)]/40 sm:h-8 sm:w-auto sm:px-3 ${
                viewMode === 'condensed'
                  ? 'border border-[var(--tab-active-border)] bg-[var(--tab-active-bg)] text-[var(--tab-active-text)]'
                  : 'border border-transparent text-[var(--text-muted)] hover:bg-[var(--tab-idle-hover-bg)] hover:text-[var(--text)]'
              }`}
              aria-pressed={viewMode === 'condensed'}
              aria-label={t.labels.bracketViewCondensed}
            >
              <Icon name="account_tree" className="text-[14px] sm:mr-1" />
              <span className="hidden sm:inline">{t.labels.bracketViewCondensed}</span>
            </button>
          </div>
        </div>
      </div>
      <BracketBoard rounds={bracketRounds} forecastTeamId={forecastTeamId || undefined} viewMode={viewMode} />
    </section>
  )
}
