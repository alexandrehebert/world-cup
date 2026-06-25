import { useLocale } from '../../contexts/locale-context'
import { useDashboard } from '../../contexts/dashboard-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate, formatPlaceholder } from '../../lib/format'
import { getPotentialTeamsFromPlaceholder, getTopTeamFromPlaceholder } from '../../lib/bracket'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'

const NODE_HEIGHT = 196
const BASE_GAP = 20
const CONNECTOR_WIDTH = 32

const getRoundMetrics = (roundIndex: number) => {
  const unit = NODE_HEIGHT + BASE_GAP
  const roundFactor = 2 ** roundIndex

  return {
    topOffset: roundIndex === 0 ? 0 : ((roundFactor - 1) * unit) / 2,
    gap: roundIndex === 0 ? BASE_GAP : roundFactor * unit - NODE_HEIGHT,
  }
}

export const BracketBoard = ({
  rounds,
}: {
  rounds: { id: string; matchIds: string[] }[]
}) => {
  const { locale, t } = useLocale()
  const { isFavoriteTeam, setSelectedMatchId } = useDashboard()
  const { matchesById, teamsById, groupsById } = useTournament()
  const groupsByIdMap = new Map(Object.entries(groupsById || {}))

  // Debug: Log if groupsByIdMap is empty
  if (typeof window !== 'undefined' && groupsByIdMap.size === 0 && Object.keys(groupsById || {}).length === 0) {
    console.warn('[BracketBoard] groupsById is empty - potential teams will not display')
  }

  const getRoundLabel = (id: string): string => ({
    roundOf32: t.labels.stageRoundOf32,
    roundOf16: t.labels.stageRoundOf16,
    quarterFinal: t.labels.stageQuarterFinal,
    semiFinal: t.labels.stageSemiFinal,
    thirdPlace: t.labels.stageThirdPlace,
    final: t.labels.stageFinal,
  }[id] ?? id)

  const renderPotentialTeamFlags = (teamIds: string[], topTeamId?: string) => (
    <div className="mt-1 flex max-h-8 flex-wrap gap-1 overflow-hidden">
      {teamIds.map((teamId) => {
        const team = teamsById[teamId]
        if (!team) return null
        const isTopTeam = teamId === topTeamId
        const teamLabel = t.teams[team.id] ?? team.name

        return (
          <span
            key={teamId}
            className={`relative inline-flex h-5 w-5 shrink-0 overflow-hidden rounded-full border ${
              isTopTeam
                ? 'border-[var(--accent-border)] ring-1 ring-[var(--accent-border)]'
                : 'border-[var(--border)] opacity-80 saturate-75'
            }`}
            title={teamLabel}
          >
            <span className={`fi fi-${team.flagCode} flag-avatar-circle-fill`} aria-hidden="true" />
            <span className="sr-only">{teamLabel}</span>
          </span>
        )
      })}
    </div>
  )

  const renderPotentialTeamAvatar = (topTeamId?: string) => {
    const topTeam = topTeamId ? teamsById[topTeamId] : undefined

    if (!topTeam) {
      return <div className="h-12 w-12 shrink-0 rounded-full border border-dashed border-[var(--border)]" />
    }

    const topTeamLabel = t.teams[topTeam.id] ?? topTeam.name

    return (
      <div
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-dashed border-[var(--border)]"
        title={topTeamLabel}
      >
        <span className={`fi fi-${topTeam.flagCode} flag-avatar-circle-fill opacity-90 saturate-75`} aria-hidden="true" />
        <span className="sr-only">{topTeamLabel}</span>
      </div>
    )
  }

  const thirdPlaceRound = rounds.find((round) => round.id === 'thirdPlace')
  const mainRounds = rounds.filter((round) => round.id !== 'thirdPlace')
  const firstRoundMatchCount = mainRounds.at(0)?.matchIds.length ?? 0
  const boardTrackHeight = Math.max(NODE_HEIGHT, firstRoundMatchCount * NODE_HEIGHT + Math.max(0, firstRoundMatchCount - 1) * BASE_GAP)

  return (
    <div className="bg-[var(--surface)] p-4 sm:p-5 lg:p-6">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-full items-start" style={{ gap: `${CONNECTOR_WIDTH}px` }}>
          {mainRounds.map((round, roundIndex) => {
            const metrics = getRoundMetrics(roundIndex)
            const hasPreviousRound = roundIndex > 0
            const hasNextRound = roundIndex < mainRounds.length - 1
            const isFinalRound = round.id === 'final'

            return (
              <div key={round.id} className="flex min-w-[230px] flex-1 basis-0 flex-col">
                <div className="border-b border-[var(--border)] pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]">
                    {getRoundLabel(round.id)}
                  </p>
                </div>

                <div className="relative mt-4" style={{ minHeight: `${boardTrackHeight}px`, paddingTop: `${metrics.topOffset}px` }}>
                  <div className="flex flex-col" style={{ gap: `${metrics.gap}px` }}>
                    {round.matchIds.length > 0 ? (
                      round.matchIds.map((matchId, matchIndex) => {
                        const match = matchesById[matchId]
                        const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                        const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                        const homePotentialTeamIds = !homeTeam && match.home.placeholder ? getPotentialTeamsFromPlaceholder(match.home.placeholder, groupsByIdMap) : []
                        const awayPotentialTeamIds = !awayTeam && match.away.placeholder ? getPotentialTeamsFromPlaceholder(match.away.placeholder, groupsByIdMap) : []
                        const homeTopTeamId = !homeTeam && match.home.placeholder ? getTopTeamFromPlaceholder(match.home.placeholder, groupsByIdMap) : undefined
                        const awayTopTeamId = !awayTeam && match.away.placeholder ? getTopTeamFromPlaceholder(match.away.placeholder, groupsByIdMap) : undefined
                        const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
                        const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
                        const hasFavorite = homeIsFavorite || awayIsFavorite
                        const { localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone)
                        const showVerticalBridge =
                          hasNextRound && matchIndex % 2 === 0 && matchIndex + 1 < round.matchIds.length

                        return (
                          <div key={match.id} className="relative">
                            {hasPreviousRound ? (
                              <span
                                className="pointer-events-none absolute top-1/2 -left-[16px] z-0 h-px bg-[var(--border)]"
                                style={{ width: `${CONNECTOR_WIDTH / 2}px` }}
                              />
                            ) : null}

                            {showVerticalBridge ? (
                              <span
                                className="pointer-events-none absolute top-1/2 -right-[16px] z-0 w-px bg-[var(--border)]"
                                style={{ height: `${NODE_HEIGHT + metrics.gap}px` }}
                              />
                            ) : null}

                            {hasNextRound ? (
                              <span
                                className="pointer-events-none absolute top-1/2 -right-[16px] z-0 h-px bg-[var(--border)]"
                                style={{ width: `${CONNECTOR_WIDTH}px` }}
                              />
                            ) : null}

                            <div className={`relative z-10 h-[196px] overflow-hidden p-3 cursor-pointer transition ${
                              hasFavorite
                                ? 'bg-[var(--accent-muted)] ring-2 ring-inset ring-[var(--accent-border)]'
                                : 'bg-[var(--surface-soft)] hover:brightness-105'
                            }`}
                            onClick={() => setSelectedMatchId(match.id)}>
                              <div className="space-y-2">
                                <div className="flex min-w-0 items-center gap-2.5 border-b border-[var(--border)] pb-2">
                                  {homeTeam ? (
                                    <FlagAvatar team={homeTeam} />
                                  ) : (
                                    renderPotentialTeamAvatar(homeTopTeamId)
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="inline-flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                      <span className="truncate">
                                        {homeTeam
                                        ? t.teams[homeTeam.id] ?? homeTeam.name
                                          : formatPlaceholder(match.home.placeholder!, t)}
                                      </span>
                                      {homeIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                                    </span>
                                    {homePotentialTeamIds.length > 0 && (
                                      renderPotentialTeamFlags(
                                        homePotentialTeamIds.filter((teamId) => teamId !== homeTopTeamId),
                                      )
                                    )}
                                  </div>
                                </div>
                                <div className="flex min-w-0 items-center gap-2.5 pb-1">
                                  {awayTeam ? (
                                    <FlagAvatar team={awayTeam} />
                                  ) : (
                                    renderPotentialTeamAvatar(awayTopTeamId)
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="inline-flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                      <span className="truncate">
                                        {awayTeam
                                        ? t.teams[awayTeam.id] ?? awayTeam.name
                                          : formatPlaceholder(match.away.placeholder!, t)}
                                      </span>
                                      {awayIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                                    </span>
                                    {awayPotentialTeamIds.length > 0 && (
                                      renderPotentialTeamFlags(
                                        awayPotentialTeamIds.filter((teamId) => teamId !== awayTopTeamId),
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 border-t border-[var(--border)] pt-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-soft)]">
                                {t.meta.localTime} · {localTime}
                              </div>
                              <div className="truncate text-xs text-[var(--text-soft)]">
                                {match.venue.stadium}
                              </div>
                              <div className="truncate text-xs text-[var(--text-muted)]">
                                {match.venue.city}, {match.venue.country}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-soft)]">
                        {t.labels.comingSoon}
                      </div>
                    )}
                  </div>
                </div>

                {isFinalRound && thirdPlaceRound && thirdPlaceRound.matchIds.length > 0 ? (
                  <div className="mt-auto pt-8">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]">
                      {getRoundLabel(thirdPlaceRound.id)}
                    </p>
                    <div className="space-y-px">
                      {thirdPlaceRound.matchIds.map((matchId) => {
                        const match = matchesById[matchId]
                        const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                        const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                        const homePotentialTeamIds = !homeTeam && match.home.placeholder ? getPotentialTeamsFromPlaceholder(match.home.placeholder, groupsByIdMap) : []
                        const awayPotentialTeamIds = !awayTeam && match.away.placeholder ? getPotentialTeamsFromPlaceholder(match.away.placeholder, groupsByIdMap) : []
                        const homeTopTeamId = !homeTeam && match.home.placeholder ? getTopTeamFromPlaceholder(match.home.placeholder, groupsByIdMap) : undefined
                        const awayTopTeamId = !awayTeam && match.away.placeholder ? getTopTeamFromPlaceholder(match.away.placeholder, groupsByIdMap) : undefined
                        const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
                        const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
                        const hasFavorite = homeIsFavorite || awayIsFavorite
                        const { localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone)

                        return (
                          <div key={match.id} className={`p-3 cursor-pointer transition ${
                            hasFavorite
                              ? 'bg-[var(--accent-muted)] ring-2 ring-inset ring-[var(--accent-border)]'
                              : 'bg-[var(--surface-soft)] hover:brightness-105'
                          }`}
                          onClick={() => setSelectedMatchId(match.id)}>
                            <div className="space-y-2">
                              <div className="flex min-w-0 items-center gap-2.5 border-b border-[var(--border)] pb-2">
                                {homeTeam ? (
                                  <FlagAvatar team={homeTeam} />
                                ) : (
                                  renderPotentialTeamAvatar(homeTopTeamId)
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="inline-flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                    <span className="truncate">
                                      {homeTeam
                                        ? t.teams[homeTeam.id] ?? homeTeam.name
                                        : formatPlaceholder(match.home.placeholder!, t)}
                                    </span>
                                    {homeIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                                  </span>
                                  {homePotentialTeamIds.length > 0 && (
                                    renderPotentialTeamFlags(
                                      homePotentialTeamIds.filter((teamId) => teamId !== homeTopTeamId),
                                    )
                                  )}
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2.5 pb-1">
                                {awayTeam ? (
                                  <FlagAvatar team={awayTeam} />
                                ) : (
                                  renderPotentialTeamAvatar(awayTopTeamId)
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="inline-flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                    <span className="truncate">
                                      {awayTeam
                                        ? t.teams[awayTeam.id] ?? awayTeam.name
                                        : formatPlaceholder(match.away.placeholder!, t)}
                                    </span>
                                    {awayIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                                  </span>
                                  {awayPotentialTeamIds.length > 0 && (
                                    renderPotentialTeamFlags(
                                      awayPotentialTeamIds.filter((teamId) => teamId !== awayTopTeamId),
                                    )
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 border-t border-[var(--border)] pt-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-soft)]">
                              {t.meta.localTime} · {localTime}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
