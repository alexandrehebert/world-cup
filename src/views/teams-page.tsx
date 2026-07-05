import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { FlagAvatar } from '../components/ui/flag-avatar'
import { useDashboard } from '../contexts/dashboard-context'
import { useLocale } from '../contexts/locale-context'
import { useNow, useTimeZone } from '../contexts/time-context'
import { useTournament } from '../contexts/tournament-context'
import { resolveCompetitionId } from '../competitions'
import { hidesGroupStageLabel, supportsTeamEliminationFilter, usesStandingsSectionPath } from '../lib/competition-sections'
import { formatMatchDate, getDisplayMatchStatus, getLocalizedText } from '../lib/format'
import { Icon } from '../lib/icons'
import { isParaguayEasterEggTeamPath } from '../lib/team-route'
import { isTeamEliminated } from '../lib/team-status'
import type { MatchRecord } from '../types/tournament'

type TeamStatusFilter = 'all' | 'active' | 'eliminated'
const FAVORITES_FILTER_PARAM = 'favorites'
const STATUS_FILTER_PARAM = 'status'
const QUERY_FILTER_PARAM = 'q'

const stageLabel = (
  stage: MatchRecord['stage'],
  labels: ReturnType<typeof useLocale>['t']['labels'],
) => {
  if (stage === 'group') return labels.stageGroup
  if (stage === 'roundOf32') return labels.stageRoundOf32
  if (stage === 'roundOf16') return labels.stageRoundOf16
  if (stage === 'quarterFinal') return labels.stageQuarterFinal
  if (stage === 'semiFinal') return labels.stageSemiFinal
  if (stage === 'thirdPlace') return labels.stageThirdPlace
  return labels.stageFinal
}

export const TeamsPage = () => {
  const { locale, t } = useLocale()
  const { setSelectedTeamId, isFavoriteTeam, toggleFavoriteTeam, favoriteTeamIds } = useDashboard()
  const { meta, teamsById, groupsById, groups, matches } = useTournament()
  const competitionId = resolveCompetitionId(meta.competitionId)
  const hideGroupStage = hidesGroupStageLabel(competitionId)
  const useStandingsHeader = usesStandingsSectionPath(competitionId)
  const showTeamStatusFilter = supportsTeamEliminationFilter(competitionId)
  const nowMs = useNow()
  const localTimeZone = useTimeZone()
  const { teamCode } = useParams()
  const showParaguayEasterEgg = isParaguayEasterEggTeamPath(teamCode)
  const [searchParams, setSearchParams] = useSearchParams()
  const favoritesOnly = searchParams.get(FAVORITES_FILTER_PARAM) === '1'
  const statusFilterParam = searchParams.get(STATUS_FILTER_PARAM)
  const statusFilter: TeamStatusFilter = statusFilterParam === 'active' || statusFilterParam === 'eliminated' ? statusFilterParam : 'all'
  const effectiveStatusFilter: TeamStatusFilter = showTeamStatusFilter ? statusFilter : 'all'
  const query = searchParams.get(QUERY_FILTER_PARAM) ?? ''
  const setFavoritesOnly = (nextValue: boolean) => {
    const nextParams = new URLSearchParams(searchParams)

    if (nextValue) {
      nextParams.set(FAVORITES_FILTER_PARAM, '1')
    } else {
      nextParams.delete(FAVORITES_FILTER_PARAM)
    }

    setSearchParams(nextParams, { replace: true })
  }
  const setStatusFilter = (nextValue: TeamStatusFilter) => {
    const nextParams = new URLSearchParams(searchParams)

    if (nextValue === 'all') {
      nextParams.delete(STATUS_FILTER_PARAM)
    } else {
      nextParams.set(STATUS_FILTER_PARAM, nextValue)
    }

    setSearchParams(nextParams, { replace: true })
  }
  const setQuery = (nextValue: string) => {
    const nextParams = new URLSearchParams(searchParams)

    if (nextValue.trim().length > 0) {
      nextParams.set(QUERY_FILTER_PARAM, nextValue)
    } else {
      nextParams.delete(QUERY_FILTER_PARAM)
    }

    setSearchParams(nextParams, { replace: true })
  }

  const groupByTeamId = useMemo(() => {
    const mapping: Record<string, { id: string; standingIndex: number; standing: NonNullable<(typeof groupsById)[string]['standings'][number] | undefined> }> = {}

    for (const group of Object.values(groupsById)) {
      group.standings.forEach((standing, index) => {
        mapping[standing.teamId] = {
          id: group.id,
          standingIndex: index,
          standing,
        }
      })
    }

    return mapping
  }, [groupsById])

  const teams = useMemo(() => {
    return Object.values(teamsById)
      .map((team) => {
        const label = t.teams[team.id] ?? getLocalizedText(team.name, locale) ?? team.code
        const teamMatches = matches
          .filter((match) => match.home.teamId === team.id || match.away.teamId === team.id)
          .sort((first, second) => first.kickoff.localeCompare(second.kickoff))
        const nextMatch = teamMatches.find((match) => getDisplayMatchStatus(match, nowMs) !== 'finished')
        const latestMatch = teamMatches.length > 0 ? teamMatches[teamMatches.length - 1] : null
        const eliminated = isTeamEliminated({ teamId: team.id, matches, nowMs, competitionId: meta.competitionId, groups })
        const groupInfo = groupByTeamId[team.id]
        const latestOpponentId = latestMatch
          ? (latestMatch.home.teamId === team.id ? latestMatch.away.teamId : latestMatch.home.teamId)
          : null
        const latestOpponent = latestOpponentId ? teamsById[latestOpponentId] : undefined
        const latestOpponentLabel = latestOpponent
          ? (t.teams[latestOpponent.id] ?? getLocalizedText(latestOpponent.name, locale) ?? latestOpponent.code)
          : t.labels.tbd
        const latestHomeScore = typeof latestMatch?.home.score === 'number' ? latestMatch.home.score : null
        const latestAwayScore = typeof latestMatch?.away.score === 'number' ? latestMatch.away.score : null
        const latestTeamScore = latestMatch ? (latestMatch.home.teamId === team.id ? latestHomeScore : latestAwayScore) : null
        const latestOpponentScore = latestMatch ? (latestMatch.home.teamId === team.id ? latestAwayScore : latestHomeScore) : null
        const nextMatchFormatted = nextMatch ? formatMatchDate(nextMatch.kickoff, locale, localTimeZone, t.labels.today).localDateTime : null

        return {
          team,
          label,
          groupInfo,
          isFavorite: isFavoriteTeam(team.id),
          eliminated,
          nextMatch,
          latestMatch,
          latestOpponentLabel,
          latestTeamScore,
          latestOpponentScore,
          nextMatchFormatted,
        }
      })
      .sort((first, second) => first.label.localeCompare(second.label))
  }, [groupByTeamId, groups, isFavoriteTeam, locale, localTimeZone, matches, meta.competitionId, nowMs, t.labels, t.teams, teamsById])

  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const favoritesSet = new Set(favoriteTeamIds)

    return teams.filter((entry) => {
      if (favoritesOnly && !favoritesSet.has(entry.team.id)) {
        return false
      }

      if (effectiveStatusFilter === 'active' && entry.eliminated) {
        return false
      }

      if (effectiveStatusFilter === 'eliminated' && !entry.eliminated) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return entry.label.toLowerCase().includes(normalizedQuery) || entry.team.code.toLowerCase().includes(normalizedQuery)
    })
  }, [effectiveStatusFilter, favoriteTeamIds, favoritesOnly, query, teams])

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.teams}</h2>
      </div>

      {showParaguayEasterEgg ? (
        <div className="border border-[var(--accent-border)] bg-[var(--accent-muted)] px-4 py-3 text-sm font-semibold text-[var(--text)]">
          {t.labels.teamParaguayEasterEggMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-soft)]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.labels.searchTeamsPlaceholder}
            className="h-10 w-full border border-[var(--border)] bg-[var(--surface)] pl-10 pr-3 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--accent-border)]"
          />
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            disabled={favoriteTeamIds.length === 0}
            className={`inline-flex h-10 flex-1 items-center justify-center gap-2 border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none ${
              favoritesOnly
                ? 'border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent-text)]'
                : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]'
            }`}
          >
            <Icon name="star" className="text-[16px]" />
            <span>{t.labels.filterByFavorites}</span>
          </button>

          {showTeamStatusFilter ? (
            <div
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-soft)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              role="group"
              aria-label={t.headings.teams}
            >
              {([
                { value: 'all' as const, label: t.labels.filterAll, icon: 'apps' },
                { value: 'active' as const, label: t.labels.filterActiveTeams, icon: 'sports_soccer' },
                { value: 'eliminated' as const, label: t.labels.filterEliminatedTeams, icon: 'block' },
              ] as const).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                  className={`inline-flex h-8 w-8 items-center justify-center px-0 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-muted)]/40 sm:w-auto sm:gap-1 sm:px-3 ${
                    effectiveStatusFilter === item.value
                      ? 'border border-[var(--tab-active-border)] bg-[var(--tab-active-bg)] text-[var(--tab-active-text)]'
                      : 'border border-transparent text-[var(--text-muted)] hover:bg-[var(--tab-idle-hover-bg)] hover:text-[var(--text)]'
                  }`}
                  aria-pressed={effectiveStatusFilter === item.value}
                  aria-label={item.label}
                >
                  <Icon name={item.icon} className="text-[14px] sm:hidden" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredTeams.map((entry) => {
            const {
              team,
              label,
              groupInfo,
              isFavorite,
              eliminated,
              nextMatch,
              latestMatch,
              latestOpponentLabel,
              latestTeamScore,
              latestOpponentScore,
              nextMatchFormatted,
            } = entry
            const groupLabel = groupInfo ? (useStandingsHeader ? t.labels.standings : (t.groups[groupInfo.id] ?? groupInfo.id)) : null
            const standingPosition = groupInfo ? groupInfo.standingIndex + 1 : null

            return (
              <div
                key={team.id}
                className={`relative overflow-hidden border border-[var(--border)] ${
                  eliminated
                    ? 'past-match-stripes bg-[var(--surface-soft)] opacity-70 saturate-50 hover:opacity-90'
                    : isFavorite
                      ? 'bg-[var(--accent-muted)] hover:bg-[var(--calendar-favorite-hover-bg)]'
                      : 'bg-[var(--surface)]'
                } ${isFavorite ? 'border-l-4 border-l-[var(--accent)]' : 'hover:bg-[var(--surface-soft)]'} transition`}
              >
                <div className="flex items-start justify-between gap-2 px-4 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTeamId(team.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <FlagAvatar team={team} className="h-10 w-10" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--text-strong)]">{label}</span>
                      <span className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{team.code}</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFavoriteTeam(team.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-soft)] transition hover:text-[var(--text-strong)]"
                    aria-label={t.labels.favorite}
                    title={t.labels.favorite}
                  >
                    <Icon name="star" className={`text-[18px] ${isFavorite ? 'text-[var(--accent-text)]' : ''}`.trim()} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTeamId(team.id)}
                  className="block w-full px-4 pb-3 text-left"
                >
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {groupLabel ? (
                      <span className="border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-[var(--text-soft)]">
                        {groupLabel}
                        {standingPosition ? ` · #${standingPosition}` : ''}
                      </span>
                    ) : null}
                    {groupInfo ? (
                      <span className="border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-[var(--text-soft)]">
                        {groupInfo.standing.points} {t.labels.points} · {groupInfo.standing.won}-{groupInfo.standing.drawn}-{groupInfo.standing.lost}
                      </span>
                    ) : null}
                    {eliminated ? (
                      <span className="border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 font-semibold text-[var(--text-muted)]">
                        {t.labels.eliminated}
                      </span>
                    ) : null}
                  </div>

                  {nextMatch && nextMatchFormatted ? (
                    <p className="mt-2 text-xs text-[var(--text-soft)]">
                      {nextMatch.stage === 'group' && hideGroupStage ? nextMatchFormatted : `${stageLabel(nextMatch.stage, t.labels)} · ${nextMatchFormatted}`}
                    </p>
                  ) : latestMatch && latestTeamScore !== null && latestOpponentScore !== null ? (
                    <p className="mt-2 text-xs text-[var(--text-soft)]">
                      {latestMatch.stage === 'group' && hideGroupStage
                        ? `${latestTeamScore}-${latestOpponentScore} ${t.labels.vs} ${latestOpponentLabel}`
                        : `${stageLabel(latestMatch.stage, t.labels)} · ${latestTeamScore}-${latestOpponentScore} ${t.labels.vs} ${latestOpponentLabel}`}
                    </p>
                  ) : null}
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-[var(--surface)] px-6 py-6 text-center text-sm text-[var(--text-muted)]">
          {t.labels.noTeamsForFilters}
        </div>
      )}
    </section>
  )
}
