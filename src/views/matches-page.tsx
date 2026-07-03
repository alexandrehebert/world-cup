import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDashboard } from '../contexts/dashboard-context'
import { useLocale } from '../contexts/locale-context'
import { useTournament } from '../contexts/tournament-context'
import { MatchesList } from '../components/matches/matches-list'
import { Icon } from '../lib/icons'
import { getLocalizedText } from '../lib/format'
import { isSearchMatch } from '../lib/search'

const FAVORITES_FILTER_PARAM = 'favorites'
const TEAM_CODES_FILTER_PARAM = 'teams'

export const MatchesPage = () => {
  const { locale, t } = useLocale()
  const { favoriteTeamIds } = useDashboard()
  const { upcomingMatches, teamsById } = useTournament()
  const [searchParams, setSearchParams] = useSearchParams()
  const [countryQuery, setCountryQuery] = useState('')
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false)
  const countryFilterRef = useRef<HTMLDivElement>(null)
  const countryInputRef = useRef<HTMLInputElement>(null)

  const getTeamLabel = useCallback(
    (team: NonNullable<(typeof teamsById)[string]>) => t.teams[team.id] ?? getLocalizedText(team.name, locale) ?? team.code,
    [locale, t],
  )

  const countriesInUpcoming = useMemo(() => {
    const uniqueTeamIds = new Set<string>()

    for (const match of upcomingMatches) {
      if (match.home.teamId) {
        uniqueTeamIds.add(match.home.teamId)
      }

      if (match.away.teamId) {
        uniqueTeamIds.add(match.away.teamId)
      }
    }

    return [...uniqueTeamIds]
      .map((teamId) => teamsById[teamId])
      .filter((team): team is NonNullable<typeof team> => Boolean(team))
      .sort((first, second) => getTeamLabel(first).localeCompare(getTeamLabel(second)))
  }, [getTeamLabel, teamsById, upcomingMatches])

  const { teamIdToCode, codeToTeamId } = useMemo(() => {
    const idToCode: Record<string, string> = {}
    const codeToId: Record<string, string> = {}

    for (const team of Object.values(teamsById)) {
      const normalizedCode = team.code.trim().toUpperCase()

      if (!normalizedCode) {
        continue
      }

      idToCode[team.id] = normalizedCode

      if (!codeToId[normalizedCode]) {
        codeToId[normalizedCode] = team.id
      }
    }

    return {
      teamIdToCode: idToCode,
      codeToTeamId: codeToId,
    }
  }, [teamsById])

  const updateFilterParams = useCallback((updater: (params: URLSearchParams) => void) => {
    const nextParams = new URLSearchParams(searchParams)
    updater(nextParams)

    if (nextParams.toString() === searchParams.toString()) {
      return
    }

    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  const favoritesOnly = searchParams.get(FAVORITES_FILTER_PARAM) === '1'
  const selectedTeamIds = useMemo(() => {
    const serializedTeamCodes = searchParams.get(TEAM_CODES_FILTER_PARAM)

    if (!serializedTeamCodes) {
      return [] as string[]
    }

    const uniqueTeamIds = new Set<string>()

    for (const teamCode of serializedTeamCodes.split(',')) {
      const normalizedCode = teamCode.trim().toUpperCase()

      if (!normalizedCode) {
        continue
      }

      const teamId = codeToTeamId[normalizedCode]

      if (teamId) {
        uniqueTeamIds.add(teamId)
      }
    }

    return [...uniqueTeamIds]
  }, [codeToTeamId, searchParams])

  const setFavoritesOnly = useCallback((nextValue: boolean) => {
    updateFilterParams((params) => {
      if (nextValue) {
        params.set(FAVORITES_FILTER_PARAM, '1')
      } else {
        params.delete(FAVORITES_FILTER_PARAM)
      }
    })
  }, [updateFilterParams])

  const setSelectedTeamIds = useCallback((nextTeamIds: SetStateAction<string[]>) => {
    updateFilterParams((params) => {
      const resolvedTeamIds = typeof nextTeamIds === 'function' ? nextTeamIds(selectedTeamIds) : nextTeamIds
      const serializedTeamCodes = resolvedTeamIds
        .map((teamId) => teamIdToCode[teamId])
        .filter((teamCode): teamCode is string => Boolean(teamCode))
        .join(',')

      if (!serializedTeamCodes) {
        params.delete(TEAM_CODES_FILTER_PARAM)
        return
      }

      params.set(TEAM_CODES_FILTER_PARAM, serializedTeamCodes)
    })
  }, [selectedTeamIds, teamIdToCode, updateFilterParams])

  const filteredMatches = useMemo(() => {
    let matches = upcomingMatches

    if (favoritesOnly && favoriteTeamIds.length > 0) {
      const favorites = new Set(favoriteTeamIds)
      matches = matches.filter((match) => {
        const homeId = match.home.teamId
        const awayId = match.away.teamId
        return (homeId !== undefined && favorites.has(homeId)) || (awayId !== undefined && favorites.has(awayId))
      })
    }

    if (selectedTeamIds.length > 0) {
      const selected = new Set(selectedTeamIds)
      matches = matches.filter((match) => {
        const homeId = match.home.teamId
        const awayId = match.away.teamId
        return (homeId !== undefined && selected.has(homeId)) || (awayId !== undefined && selected.has(awayId))
      })
    }

    return matches
  }, [favoritesOnly, favoriteTeamIds, selectedTeamIds, upcomingMatches])

  const selectedCountries = useMemo(() => {
    return selectedTeamIds
      .map((teamId) => teamsById[teamId])
      .filter((team): team is NonNullable<typeof team> => Boolean(team))
  }, [selectedTeamIds, teamsById])

  const countrySearchResults = useMemo(() => {
    if (!countryQuery.trim()) {
      return countriesInUpcoming
    }

    return countriesInUpcoming.filter((team) => isSearchMatch(countryQuery, [getTeamLabel(team), team.code]))
  }, [countriesInUpcoming, countryQuery, getTeamLabel])

  const toggleTeamFilter = (teamId: string) => {
    setSelectedTeamIds((current) => {
      if (current.includes(teamId)) {
        return current.filter((id) => id !== teamId)
      }

      return [...current, teamId]
    })
  }

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!countryFilterRef.current?.contains(event.target as Node)) {
        setIsCountryMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  return (
    <section className="relative isolate space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.matches}</h2>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div ref={countryFilterRef} className="relative z-40 min-w-0 flex-1">
          <div className="relative z-50">
            <div
              className="flex min-h-10 w-full flex-wrap items-center gap-2 border border-[var(--border)] bg-[var(--surface)] pl-3 pr-10 transition focus-within:border-[var(--accent-border)]"
              role="combobox"
              aria-expanded={isCountryMenuOpen}
              aria-label={t.labels.filterByCountries}
              onClick={() => {
                setIsCountryMenuOpen(true)
                countryInputRef.current?.focus()
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Icon name="search" className="text-[18px] leading-none text-[var(--text-soft)]" />
                {selectedCountries.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleTeamFilter(team.id)
                    }}
                    className="inline-flex items-center gap-1.5 border border-[var(--accent-border)] bg-[var(--accent-muted)] px-1.5 py-0.5 text-xs text-[var(--accent-text)]"
                    title={getTeamLabel(team)}
                  >
                    <span className="inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-[var(--border)]" aria-hidden="true">
                      <span className={`fi fi-${team.flagCode} flag-avatar-fill block h-full w-full`} />
                    </span>
                    <span>{getTeamLabel(team)}</span>
                    <Icon name="close" className="text-[14px] leading-none text-[var(--text-muted)]" />
                  </button>
                ))}

                <input
                  ref={countryInputRef}
                  type="text"
                  value={countryQuery}
                  placeholder={selectedCountries.length === 0 ? t.labels.searchCountryPlaceholder : ''}
                  onFocus={() => setIsCountryMenuOpen(true)}
                  onChange={(event) => {
                    setCountryQuery(event.target.value)
                    setIsCountryMenuOpen(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setIsCountryMenuOpen(false)
                    }

                    if (event.key === 'Backspace' && !countryQuery && selectedTeamIds.length > 0) {
                      setSelectedTeamIds((current) => current.slice(0, -1))
                    }

                    if (event.key === 'Enter' && countrySearchResults.length > 0) {
                      event.preventDefault()
                      const firstResult = countrySearchResults[0]
                      toggleTeamFilter(firstResult.id)
                      setCountryQuery('')
                      setIsCountryMenuOpen(true)
                    }
                  }}
                  className="min-w-[9rem] flex-1 bg-transparent text-sm text-[var(--text-strong)] outline-none"
                />
              </div>

              {(selectedTeamIds.length > 0 || countryQuery.length > 0) && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedTeamIds([])
                    setCountryQuery('')
                    countryInputRef.current?.focus()
                  }}
                  aria-label={t.labels.clearCountryFilters}
                  title={t.labels.clearCountryFilters}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 text-[var(--text-muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--text-strong)]"
                >
                  <Icon name="close" className="text-[18px] leading-none" />
                </button>
              )}
            </div>

            {isCountryMenuOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[70] max-h-64 overflow-y-auto border border-[var(--border)] bg-[var(--surface-strong)] p-2">
                {countrySearchResults.length > 0 ? (
                  <div className="grid gap-1">
                    {countrySearchResults.map((team) => {
                      const selected = selectedTeamIds.includes(team.id)

                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => {
                            toggleTeamFilter(team.id)
                            setCountryQuery('')
                            setIsCountryMenuOpen(true)
                          }}
                          className={`flex w-full items-center justify-between px-2 py-2 text-left text-sm transition ${
                            selected ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]' : 'hover:bg-[var(--surface-soft)] text-[var(--text)]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="inline-flex h-5 w-7 shrink-0 overflow-hidden rounded-[4px] border border-[var(--border)]" aria-hidden="true">
                              <span className={`fi fi-${team.flagCode} flag-avatar-fill block h-full w-full`} />
                            </span>
                            <span>{getTeamLabel(team)}</span>
                          </span>
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">{team.code}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="px-2 py-2 text-sm text-[var(--text-muted)]">{t.labels.noCountrySearchResults}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          disabled={favoriteTeamIds.length === 0}
          className={`inline-flex w-full shrink-0 items-center gap-2 border px-3 py-0 h-10 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto ${
            favoritesOnly
              ? 'border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent-text)]'
              : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]'
          }`}
        >
          <Icon name="star" className="text-[16px]" />
          <span>{t.labels.filterByFavorites}</span>
        </button>
      </div>

      {filteredMatches.length > 0 ? (
        <div className="relative z-0">
          <MatchesList matches={filteredMatches} />
        </div>
      ) : (
        <div className="bg-[var(--surface)] px-6 py-6 text-center text-sm text-[var(--text-muted)]">
          {favoritesOnly && favoriteTeamIds.length > 0 ? t.labels.noMatchesForFavorites : t.labels.noMatchesForCountries}
        </div>
      )}
    </section>
  )
}
