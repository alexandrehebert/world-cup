import { useCallback } from 'react'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { useNow } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import {
  formatMatchDate,
  getDisplayMatchStatus,
  getLocalizedText,
  getMatchDisplayTime,
  hasDisplayScore,
} from '../../lib/format'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'
import { LivePulse } from '../ui/live-pulse'
import { ModalShell } from '../ui/modal-shell'
import { StatusPill } from '../ui/status-pill'
import type { MatchRecord } from '../../types/tournament'

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

export const CountryModal = () => {
  const { selectedTeamId, setSelectedTeamId, setSelectedMatchId, isFavoriteTeam, toggleFavoriteTeam } =
    useDashboard()
  const { locale, t } = useLocale()
  const { teamsById, groupsById, matches } = useTournament()
  const nowMs = useNow()
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const team = selectedTeamId ? teamsById[selectedTeamId] : undefined

  const closeModal = useCallback(() => {
    setSelectedTeamId(null)
  }, [setSelectedTeamId])

  if (!selectedTeamId || !team) {
    return null
  }

  const teamLabel = t.teams[team.id] ?? team.name
  const isFavorite = isFavoriteTeam(team.id)

  // Find the group this team belongs to (group stage only)
  const group = Object.values(groupsById).find((g) => g.teamIds.includes(team.id))
  const standing = group?.standings.find((s) => s.teamId === team.id)
  const standingIndex = group ? group.standings.findIndex((s) => s.teamId === team.id) : -1

  // Find all matches involving this team
  const teamMatches = [...matches]
    .filter((m) => m.home.teamId === team.id || m.away.teamId === team.id)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))

  const liveMatches = teamMatches.filter((m) => getDisplayMatchStatus(m, nowMs) === 'live')
  const upcomingMatches = teamMatches.filter((m) => getDisplayMatchStatus(m, nowMs) === 'scheduled')
  const pastMatches = [...teamMatches]
    .filter((m) => getDisplayMatchStatus(m, nowMs) === 'finished')
    .reverse()

  const openMatch = (matchId: string) => {
    setSelectedMatchId(matchId)
  }

  const renderMatchRow = (match: MatchRecord) => {
    const isHome = match.home.teamId === team.id
    const opponentId = isHome ? match.away.teamId : match.home.teamId
    const opponent = opponentId ? teamsById[opponentId] : undefined
    const opponentLabel = opponent
      ? (t.teams[opponent.id] ?? getLocalizedText(opponent.name, locale) ?? opponent.code)
      : t.labels.tbd
    const displayStatus = getDisplayMatchStatus(match, nowMs)
    const isLive = displayStatus === 'live'
    const isFinished = displayStatus === 'finished'
    const displayScore = hasDisplayScore(match, nowMs)
    const homeScore = typeof match.home.score === 'number' ? match.home.score : null
    const awayScore = typeof match.away.score === 'number' ? match.away.score : null
    const teamScore = isHome ? homeScore : awayScore
    const opponentScore = isHome ? awayScore : homeScore
    const teamWon =
      isFinished &&
      teamScore !== null &&
      opponentScore !== null &&
      teamScore > opponentScore
    const { localDateTime } = formatMatchDate(match.kickoff, locale, localTimeZone, t.labels.today)
    const displayTiming = getMatchDisplayTime(match, t.labels, nowMs, locale)
    const displayDateTime = displayTiming ?? localDateTime
    const venueCity = getLocalizedText(match.venue.city, locale)
    const venueCountry = getLocalizedText(match.venue.country, locale)
    const venueLabel = [venueCity, venueCountry].filter(Boolean).join(', ')

    return (
      <button
        key={match.id}
        type="button"
        onClick={() => openMatch(match.id)}
        className={`w-full text-left transition ${
          isFinished
            ? 'past-match-stripes bg-[var(--surface-soft)] opacity-70 saturate-50 hover:opacity-90'
            : isLive
              ? 'bg-[var(--surface)] hover:bg-[var(--surface-strong)]'
              : 'bg-[var(--surface)] hover:bg-[var(--surface-strong)]'
        } ${isLive ? 'border-l-2 border-l-[var(--accent)]' : ''}`}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="shrink-0">
            {opponent ? (
              <FlagAvatar team={opponent} className="h-8 w-8" />
            ) : (
              <span className="block h-8 w-8 rounded-full border border-[var(--border)]" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-semibold text-[var(--text-strong)]">
              {isLive ? <LivePulse className="h-2.5 w-2.5 shrink-0" /> : null}
              <span className="truncate">{opponentLabel}</span>
              <span className="shrink-0 text-xs font-normal text-[var(--text-soft)]">
                {opponent?.code ?? t.labels.tbd}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">
              {stageLabel(match.stage, t.labels)} · {displayDateTime}
            </p>
            {venueLabel ? (
              <p className="text-xs text-[var(--text-soft)]">{venueLabel}</p>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            {displayScore ? (
              <p className={`text-sm font-bold ${teamWon ? 'text-[var(--accent-text)]' : 'text-[var(--text-strong)]'}`}>
                {teamScore} – {opponentScore}
              </p>
            ) : isLive ? (
              <StatusPill
                status="live"
                label={<span className="inline-flex items-center gap-1"><LivePulse className="h-2 w-2" />{t.labels.live}</span>}
              />
            ) : (
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">{t.labels.vs}</p>
            )}
          </div>
        </div>
      </button>
    )
  }

  return (
    <ModalShell
      titleId="country-modal-title"
      title={teamLabel}
      onClose={closeModal}
    >
      {/* Team hero */}
      <div className="flex items-center gap-4">
        <FlagAvatar team={team} className="h-16 w-16 sm:h-20 sm:w-20" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xl font-bold text-[var(--text-strong)] sm:text-2xl">{teamLabel}</h4>
            <button
              type="button"
              onClick={() => toggleFavoriteTeam(team.id)}
              className="cursor-pointer rounded-full p-1 text-[var(--text-soft)] transition hover:text-[var(--text-strong)]"
              aria-label={t.labels.favorite}
              title={t.labels.favorite}
            >
              <Icon
                name="star"
                className={`text-[20px] ${isFavorite ? 'text-[var(--accent-text)]' : ''}`.trim()}
              />
            </button>
          </div>
          <p className="mt-0.5 text-sm uppercase tracking-[0.22em] text-[var(--text-soft)]">{team.code}</p>
        </div>
      </div>

      {/* Group standing */}
      {group && standing && standingIndex >= 0 ? (
        <div className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
            {t.groups[group.id] ?? group.label} — {t.labels.groupPosition}
          </p>
          <div className="grid grid-cols-[1.8fr_repeat(4,minmax(0,0.35fr))_0.5fr] gap-1 border-b border-[var(--border)] pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            <span>{t.labels.standings}</span>
            <span className="text-center">{t.labels.played}</span>
            <span className="text-center">{t.labels.won}</span>
            <span className="text-center">{t.labels.drawn}</span>
            <span className="text-center">{t.labels.lost}</span>
            <span className="text-right">{t.labels.points}</span>
          </div>
          <div
            className={`mt-2 grid grid-cols-[1.8fr_repeat(4,minmax(0,0.35fr))_0.5fr] items-center gap-1 ${
              standingIndex < 2
                ? 'border-l-2 border-l-[var(--accent)] pl-2'
                : 'pl-2'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-4 text-xs font-semibold text-[var(--text-soft)]">{standingIndex + 1}</span>
              <FlagAvatar team={team} className="h-6 w-6" />
              <div>
                <p className="flex items-center gap-1 text-sm font-semibold text-[var(--text-strong)]">
                  <span>{teamLabel}</span>
                  {isFavorite ? <Icon name="star" className="text-[12px] text-[var(--accent-text)]" /> : null}
                </p>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{team.code}</p>
              </div>
            </div>
            <span className="text-center text-sm text-[var(--text)]">{standing.played}</span>
            <span className="text-center text-sm text-[var(--text)]">{standing.won}</span>
            <span className="text-center text-sm text-[var(--text)]">{standing.drawn}</span>
            <span className="text-center text-sm text-[var(--text)]">{standing.lost}</span>
            <span className="text-right text-sm font-bold text-[var(--text-strong)]">{standing.points}</span>
          </div>
        </div>
      ) : null}

      {/* Matches */}
      {teamMatches.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t.labels.noMatchesForTeam}</p>
      ) : (
        <div className="space-y-4">
          {liveMatches.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-text)]">
                <LivePulse className="h-2.5 w-2.5" />
                {t.labels.liveMatchesSection}
              </p>
              <div className="divide-y divide-[var(--border)] border border-[var(--border)]">
                {liveMatches.map(renderMatchRow)}
              </div>
            </div>
          ) : null}

          {upcomingMatches.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                {t.labels.upcomingMatchesSection}
              </p>
              <div className="divide-y divide-[var(--border)] border border-[var(--border)]">
                {upcomingMatches.map(renderMatchRow)}
              </div>
            </div>
          ) : null}

          {pastMatches.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                {t.labels.pastMatchesSection}
              </p>
              <div className="divide-y divide-[var(--border)] border border-[var(--border)]">
                {pastMatches.map(renderMatchRow)}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </ModalShell>
  )
}
