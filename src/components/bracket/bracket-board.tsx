import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '../../contexts/locale-context'
import { useDashboard } from '../../contexts/dashboard-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate, formatPlaceholder } from '../../lib/format'
import { getPotentialTeamsFromPlaceholder, getTopTeamFromPlaceholder } from '../../lib/bracket'
import { Icon } from '../../lib/icons'
import { compareStandings } from '../../lib/standings'
import type { GroupRecord, MatchRecord, ParticipantRef, StandingRecord } from '../../types/tournament'

const MIN_NODE_HEIGHT = 216
const CONDENSED_NODE_HEIGHT = 48
const CONDENSED_CONNECTOR_WIDTH = 16
const BASE_GAP = 20
const CONNECTOR_WIDTH = 32

const getRoundMetrics = (roundIndex: number, nodeHeight: number) => {
  const unit = nodeHeight + BASE_GAP
  const roundFactor = 2 ** roundIndex

  return {
    topOffset: roundIndex === 0 ? 0 : ((roundFactor - 1) * unit) / 2,
    gap: roundIndex === 0 ? BASE_GAP : roundFactor * unit - nodeHeight,
  }
}

type BracketParticipantPosition = {
  roundId: string
  roundIndex: number
  matchId: string
  slotIndex: number
}

type ForecastPath = {
  pathMatchIds: Set<string>
  projectedOpponentByMatchId: Map<string, string | undefined>
  forcedWinnerByMatchId: Map<string, string>
}

type BracketViewMode = 'detailed' | 'condensed'

type PlaceholderResolutionContext = {
  groupsByIdMap: Map<string, GroupRecord>
  matchesById: Record<string, MatchRecord>
  positionByMatchId: Map<string, BracketParticipantPosition>
  matchIdByRoundAndSlot: Map<string, string>
  standingsByTeamId: Map<string, StandingRecord>
  teamsById: Record<string, { id: string; name: string; code: string }>
}

const getRoundSlotKey = (roundId: string, slotIndex: number) => `${roundId}:${slotIndex}`

const hasNumericScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const getWinnerSourceMatchId = (
  participant: ParticipantRef | undefined,
  expectedRoundId: string,
  roundMatchIdsById: Map<string, string[]>,
): string | undefined => {
  const placeholder = participant?.placeholder
  if (!placeholder) return undefined

  const [placeholderType, sourceRoundId, sourceSlotIndex] = placeholder.split(':')
  if (placeholderType !== 'W' || sourceRoundId !== expectedRoundId) return undefined

  const parsedSlot = Number.parseInt(sourceSlotIndex ?? '', 10)
  if (!Number.isInteger(parsedSlot) || parsedSlot <= 0) return undefined

  return roundMatchIdsById.get(sourceRoundId)?.[parsedSlot - 1]
}

const alignSideRoundsByNextRound = (
  sideRounds: { id: string; matchIds: string[] }[],
  matchesById: Record<string, MatchRecord>,
  roundMatchIdsById: Map<string, string[]>,
) => {
  const alignedRounds = sideRounds.map((round) => ({ ...round, matchIds: [...round.matchIds] }))

  for (let roundIndex = 0; roundIndex < alignedRounds.length - 1; roundIndex += 1) {
    const currentRound = alignedRounds[roundIndex]
    const nextRound = alignedRounds[roundIndex + 1]
    const currentMatchIds = new Set(currentRound.matchIds)
    const orderedCurrentMatchIds: string[] = []

    for (const nextMatchId of nextRound.matchIds) {
      const nextMatch = matchesById[nextMatchId]
      if (!nextMatch) continue

      const sourceHomeMatchId = getWinnerSourceMatchId(nextMatch.home, currentRound.id, roundMatchIdsById)
      const sourceAwayMatchId = getWinnerSourceMatchId(nextMatch.away, currentRound.id, roundMatchIdsById)

      if (sourceHomeMatchId && currentMatchIds.has(sourceHomeMatchId) && !orderedCurrentMatchIds.includes(sourceHomeMatchId)) {
        orderedCurrentMatchIds.push(sourceHomeMatchId)
      }

      if (sourceAwayMatchId && currentMatchIds.has(sourceAwayMatchId) && !orderedCurrentMatchIds.includes(sourceAwayMatchId)) {
        orderedCurrentMatchIds.push(sourceAwayMatchId)
      }
    }

    for (const fallbackMatchId of currentRound.matchIds) {
      if (!orderedCurrentMatchIds.includes(fallbackMatchId)) {
        orderedCurrentMatchIds.push(fallbackMatchId)
      }
    }

    currentRound.matchIds = orderedCurrentMatchIds
  }

  return alignedRounds
}

const getThirdPlaceStanding = (
  groupPlaceholder: string,
  groupsByIdMap: Map<string, GroupRecord>,
): StandingRecord | undefined => {
  const candidateThirdPlaceStandings = groupPlaceholder
    .split('')
    .map((candidateGroupId) => groupsByIdMap.get(candidateGroupId)?.standings[2])
    .filter((standing): standing is StandingRecord => Boolean(standing))

  if (candidateThirdPlaceStandings.length === 0) {
    return undefined
  }

  candidateThirdPlaceStandings.sort((first, second) => compareStandings(first, second))
  return candidateThirdPlaceStandings[0]
}

const pickMostProbableWinner = (
  match: MatchRecord,
  context: PlaceholderResolutionContext,
  visitedPlaceholders: Set<string>,
  forcedWinnerByMatchId: Map<string, string> = new Map(),
): string | undefined => {
  const forcedWinnerTeamId = forcedWinnerByMatchId.get(match.id)
  if (forcedWinnerTeamId) {
    return forcedWinnerTeamId
  }

  const homeTeamId = getProjectedTeamIdFromParticipant(match.home, context, visitedPlaceholders, forcedWinnerByMatchId)
  const awayTeamId = getProjectedTeamIdFromParticipant(match.away, context, visitedPlaceholders, forcedWinnerByMatchId)

  if (homeTeamId && !awayTeamId) return homeTeamId
  if (awayTeamId && !homeTeamId) return awayTeamId
  if (!homeTeamId || !awayTeamId) return undefined

  if (
    match.status === 'finished' &&
    hasNumericScore(match.home.score) &&
    hasNumericScore(match.away.score) &&
    match.home.score !== match.away.score
  ) {
    return match.home.score > match.away.score ? homeTeamId : awayTeamId
  }

  const homeStanding = context.standingsByTeamId.get(homeTeamId)
  const awayStanding = context.standingsByTeamId.get(awayTeamId)

  if (homeStanding && awayStanding) {
    const standingComparison = compareStandings(homeStanding, awayStanding)
    if (standingComparison !== 0) {
      return standingComparison < 0 ? homeTeamId : awayTeamId
    }
  }

  const homeTeamName = context.teamsById[homeTeamId]?.name ?? homeTeamId
  const awayTeamName = context.teamsById[awayTeamId]?.name ?? awayTeamId
  return homeTeamName.localeCompare(awayTeamName) <= 0 ? homeTeamId : awayTeamId
}

const getProjectedTeamIdFromParticipant = (
  participant: ParticipantRef | undefined,
  context: PlaceholderResolutionContext,
  visitedPlaceholders: Set<string> = new Set(),
  forcedWinnerByMatchId: Map<string, string> = new Map(),
): string | undefined => {
  if (!participant) return undefined
  if (participant.teamId) return participant.teamId
  if (!participant.placeholder) return undefined

  const placeholder = participant.placeholder
  if (visitedPlaceholders.has(placeholder)) {
    return undefined
  }

  const nextVisitedPlaceholders = new Set(visitedPlaceholders)
  nextVisitedPlaceholders.add(placeholder)

  const [placeholderType, placeholderValue, maybeSlotIndex] = placeholder.split(':')

  if (placeholderType === 'G1' || placeholderType === 'G2') {
    return getTopTeamFromPlaceholder(placeholder, context.groupsByIdMap)
  }

  if (placeholderType === 'G3') {
    return getThirdPlaceStanding(placeholderValue ?? '', context.groupsByIdMap)?.teamId
  }

  if ((placeholderType === 'W' || placeholderType === 'L') && placeholderValue && maybeSlotIndex) {
    const parsedSlotIndex = Number.parseInt(maybeSlotIndex, 10)
    if (!Number.isInteger(parsedSlotIndex) || parsedSlotIndex <= 0) return undefined
    const sourceMatchId = context.matchIdByRoundAndSlot.get(getRoundSlotKey(placeholderValue, parsedSlotIndex - 1))
    if (!sourceMatchId) return undefined
    const sourceMatch = context.matchesById[sourceMatchId]
    if (!sourceMatch) return undefined

    const probableWinnerId = pickMostProbableWinner(
      sourceMatch,
      context,
      nextVisitedPlaceholders,
      forcedWinnerByMatchId,
    )
    if (placeholderType === 'W') {
      return probableWinnerId
    }

    const probableHomeId = getProjectedTeamIdFromParticipant(
      sourceMatch.home,
      context,
      nextVisitedPlaceholders,
      forcedWinnerByMatchId,
    )
    const probableAwayId = getProjectedTeamIdFromParticipant(
      sourceMatch.away,
      context,
      nextVisitedPlaceholders,
      forcedWinnerByMatchId,
    )
    if (!probableWinnerId || !probableHomeId || !probableAwayId) return undefined
    return probableWinnerId === probableHomeId ? probableAwayId : probableHomeId
  }

  return undefined
}

const getForecastPathToFinal = (
  forecastTeamId: string,
  rounds: { id: string; matchIds: string[] }[],
  context: PlaceholderResolutionContext,
): ForecastPath => {
  const projectedOpponentByMatchId = new Map<string, string | undefined>()
  const pathMatchIds = new Set<string>()
  const forcedWinnerByMatchId = new Map<string, string>()
  const mainRounds = rounds.filter((round) => round.id !== 'thirdPlace')

  let startingMatch: BracketParticipantPosition | undefined

  for (const [roundIndex, round] of mainRounds.entries()) {
    for (const [slotIndex, matchId] of round.matchIds.entries()) {
      const match = context.matchesById[matchId]
      if (!match) continue
      const projectedHome = getProjectedTeamIdFromParticipant(match.home, context)
      const projectedAway = getProjectedTeamIdFromParticipant(match.away, context)
      if (projectedHome === forecastTeamId || projectedAway === forecastTeamId) {
        startingMatch = {
          roundId: round.id,
          roundIndex,
          matchId,
          slotIndex,
        }
        break
      }
    }
    if (startingMatch) break
  }

  if (!startingMatch) {
    return { pathMatchIds, projectedOpponentByMatchId, forcedWinnerByMatchId }
  }

  let currentMatch = startingMatch

  while (currentMatch) {
    const match = context.matchesById[currentMatch.matchId]
    if (!match) break

    forcedWinnerByMatchId.set(match.id, forecastTeamId)

    const projectedHome = getProjectedTeamIdFromParticipant(match.home, context, new Set(), forcedWinnerByMatchId)
    const projectedAway = getProjectedTeamIdFromParticipant(match.away, context, new Set(), forcedWinnerByMatchId)
    const opponentParticipant = projectedHome === forecastTeamId ? match.away : projectedAway === forecastTeamId ? match.home : undefined

    pathMatchIds.add(match.id)
    projectedOpponentByMatchId.set(
      match.id,
      opponentParticipant
        ? getProjectedTeamIdFromParticipant(opponentParticipant, context, new Set(), forcedWinnerByMatchId)
        : undefined,
    )

    if (currentMatch.roundId === 'final') {
      break
    }

    const winnerToken = `W:${currentMatch.roundId}:${currentMatch.slotIndex + 1}`
    const nextRound = mainRounds[currentMatch.roundIndex + 1]
    if (!nextRound) break

    const nextMatchId = nextRound.matchIds.find((candidateMatchId) => {
      const candidateMatch = context.matchesById[candidateMatchId]
      return candidateMatch?.home.placeholder === winnerToken || candidateMatch?.away.placeholder === winnerToken
    })

    if (!nextMatchId) break
    const nextPosition = context.positionByMatchId.get(nextMatchId)
    if (!nextPosition) break
    currentMatch = nextPosition
  }

  return { pathMatchIds, projectedOpponentByMatchId, forcedWinnerByMatchId }
}

export const BracketBoard = ({
  rounds,
  forecastTeamId,
  viewMode = 'detailed',
}: {
  rounds: { id: string; matchIds: string[] }[]
  forecastTeamId?: string
  viewMode?: BracketViewMode
}) => {
  const { locale, t } = useLocale()
  const { isFavoriteTeam, setSelectedMatchId } = useDashboard()
  const { matchesById, teamsById, groupsById } = useTournament()
  const groupsByIdMap = useMemo(() => new Map(Object.entries(groupsById || {})), [groupsById])
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [measuredNodeHeight, setMeasuredNodeHeight] = useState<number>(MIN_NODE_HEIGHT)

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

  const formatBracketPlaceholder = (placeholder: string, roundId: string) => {
    if (roundId !== 'roundOf32') {
      return t.labels.tbd
    }

    return formatPlaceholder(placeholder, t)
  }

  const renderKnownTeamAvatar = (teamId: string) => {
    const team = teamsById[teamId]
    if (!team) return null

    const teamLabel = t.teams[team.id] ?? team.name

    return (
      <div
        className="relative h-12 w-12 shrink-0 rounded-full border border-[var(--border)] p-1"
        title={teamLabel}
      >
        <span className="relative block h-full w-full overflow-hidden rounded-full">
          <span className={`fi fi-${team.flagCode} flag-avatar-circle-fill`} aria-hidden="true" />
        </span>
        <span className="sr-only">{teamLabel}</span>
      </div>
    )
  }

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
        className="relative h-12 w-12 shrink-0 rounded-full border border-dashed border-[var(--border)] p-1"
        title={topTeamLabel}
      >
        <span className="relative block h-full w-full overflow-hidden rounded-full">
          <span className={`fi fi-${topTeam.flagCode} flag-avatar-circle-fill opacity-90 saturate-75`} aria-hidden="true" />
        </span>
        <span className="sr-only">{topTeamLabel}</span>
      </div>
    )
  }

  const thirdPlaceRound = rounds.find((round) => round.id === 'thirdPlace')
  const mainRounds = rounds.filter((round) => round.id !== 'thirdPlace')

  const renderCondensedMatchCard = (
    matchId: string,
    projectedHomeTeamId?: string,
    projectedAwayTeamId?: string,
  ) => {
    const match = matchesById[matchId]
    if (!match) return null

    const isForecastPathMatch = forecastPath?.pathMatchIds.has(match.id) ?? false
    const shouldResolveUnknownTeams = Boolean(forecastTeamId)
    const homeTeamId = projectedHomeTeamId ?? match.home.teamId ?? (
      shouldResolveUnknownTeams
        ? getProjectedTeamIdFromParticipant(match.home, placeholderResolutionContext, new Set(), forcedWinnerByMatchId)
        : undefined
    )
    const awayTeamId = projectedAwayTeamId ?? match.away.teamId ?? (
      shouldResolveUnknownTeams
        ? getProjectedTeamIdFromParticipant(match.away, placeholderResolutionContext, new Set(), forcedWinnerByMatchId)
        : undefined
    )

    const renderFlag = (teamId: string | undefined) => {
      const team = teamId ? teamsById[teamId] : undefined
      if (!team) {
        return (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-dashed border-[var(--border)] p-[2px]">
            <span className="h-full w-full rounded-[6px] border border-dashed border-[var(--border)]/60" />
          </span>
        )
      }

      return (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[var(--border)] p-[2px]">
          <span className="inline-flex h-full w-full items-center overflow-hidden rounded-[6px]">
            <span className={`fi fi-${team.flagCode} flag-avatar-fill`} aria-hidden="true" />
          </span>
          <span className="sr-only">{t.teams[team.id] ?? team.name}</span>
        </span>
      )
    }

    return (
      <div
        key={match.id}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setSelectedMatchId(match.id)
          }
        }}
        className={`cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          isForecastPathMatch ? 'ring-2 ring-[var(--accent-border)] ring-inset' : 'hover:bg-[var(--surface-soft)]'
        }`}
        style={{ height: `${CONDENSED_NODE_HEIGHT}px` }}
        onClick={() => setSelectedMatchId(match.id)}
      >
        <div className="flex h-full items-center justify-between gap-2 px-1">
          {renderFlag(homeTeamId)}
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-soft)]">{t.labels.vs}</span>
          {renderFlag(awayTeamId)}
        </div>
      </div>
    )
  }

  const renderCondensedTreeSide = (
    sideRounds: { id: string; matchIds: string[] }[],
    centerConnectionSide: 'left' | 'right',
  ) => {
    const startsAtCenter = centerConnectionSide === 'left'
    const sideFirstRoundMatchCount = Math.max(...sideRounds.map((round) => round.matchIds.length), 0)
    const sideTrackHeight = Math.max(
      CONDENSED_NODE_HEIGHT,
      sideFirstRoundMatchCount * CONDENSED_NODE_HEIGHT + Math.max(0, sideFirstRoundMatchCount - 1) * BASE_GAP,
    )

    return (
      <div className="pb-2 lg:flex-[4] lg:min-w-0">
        <div className="flex min-w-max items-start lg:min-w-0 lg:w-full" style={{ gap: `${CONDENSED_CONNECTOR_WIDTH}px` }}>
          {sideRounds.map((round, roundIndex) => {
            const effectiveRoundIndex = startsAtCenter
              ? sideRounds.length - 1 - roundIndex
              : roundIndex
            const metrics = getRoundMetrics(effectiveRoundIndex, CONDENSED_NODE_HEIGHT)
            const hasPreviousRound = roundIndex > 0
            const hasForwardConnection = roundIndex < sideRounds.length - 1
            const isCenterConnectorRound = round.id === 'semiFinal'
            const connectsTowardCenter = startsAtCenter ? hasPreviousRound : hasForwardConnection

            return (
              <div
                key={`${centerConnectionSide}-${round.id}`}
                className="flex w-[112px] min-w-[112px] flex-col lg:min-w-0 lg:flex-1 lg:w-auto"
              >
                <p className="border-b border-[var(--border)] pb-1 text-[10px] font-semibold whitespace-nowrap uppercase tracking-[0.2em] text-[var(--accent-text)]">
                  {getRoundLabel(round.id)}
                </p>
                <div
                  className="relative mt-3"
                  style={{ minHeight: `${sideTrackHeight}px`, paddingTop: `${metrics.topOffset}px` }}
                >
                  <div className="flex flex-col" style={{ gap: `${metrics.gap}px` }}>
                    {(() => {
                      const projectedTeamIdsInRound = new Set<string>()

                      round.matchIds.forEach((matchId) => {
                        const candidateMatch = matchesById[matchId]
                        if (!candidateMatch) return
                        if (candidateMatch.home.teamId) projectedTeamIdsInRound.add(candidateMatch.home.teamId)
                        if (candidateMatch.away.teamId) projectedTeamIdsInRound.add(candidateMatch.away.teamId)
                      })

                      const resolveProjectedTopTeamId = (
                        participant: ParticipantRef | undefined,
                      ) => {
                        if (!participant?.placeholder || !shouldResolveUnknownTeams) return undefined

                        const projectedTeamId = getProjectedTeamIdFromParticipant(
                          participant,
                          placeholderResolutionContext,
                          new Set(),
                          forcedWinnerByMatchId,
                        )

                        if (!projectedTeamId) return undefined
                        if (!projectedTeamIdsInRound.has(projectedTeamId)) {
                          projectedTeamIdsInRound.add(projectedTeamId)
                          return projectedTeamId
                        }

                        const [placeholderType, placeholderValue] = participant.placeholder.split(':')
                        if (placeholderType !== 'G3') return undefined

                        const fallbackTeamId = placeholderValue
                          .split('')
                          .map((candidateGroupId) => groupsByIdMap.get(candidateGroupId)?.standings[2])
                          .filter((standing): standing is StandingRecord => Boolean(standing))
                          .sort((first, second) => compareStandings(first, second))
                          .map((standing) => standing.teamId)
                          .find((teamId) => !projectedTeamIdsInRound.has(teamId))

                        if (!fallbackTeamId) return undefined
                        projectedTeamIdsInRound.add(fallbackTeamId)
                        return fallbackTeamId
                      }

                      return round.matchIds.map((matchId, matchIndex) => {
                        const match = matchesById[matchId]
                        const projectedHomeTeamId = match?.home.teamId
                          ? undefined
                          : resolveProjectedTopTeamId(match?.home)
                        const projectedAwayTeamId = match?.away.teamId
                          ? undefined
                          : resolveProjectedTopTeamId(match?.away)
                        const isForecastPathMatch = forecastPath?.pathMatchIds.has(matchId) ?? false
                      const nextMatchId = round.matchIds[matchIndex + 1]
                      const nextIsForecastPathMatch = (
                        nextMatchId
                          ? (forecastPath?.pathMatchIds.has(nextMatchId) ?? false)
                          : false
                      )
                      const showVerticalBridge =
                        connectsTowardCenter && matchIndex % 2 === 0 && matchIndex + 1 < round.matchIds.length
                      const bridgeHeight = CONDENSED_NODE_HEIGHT + metrics.gap
                      const highlightedBridgeHalfHeight = bridgeHeight / 2

                      return (
                        <div key={`${round.id}-${matchId}`} className="relative">
                          {hasPreviousRound ? (
                            <span
                              className={`pointer-events-none absolute top-1/2 -left-[8px] z-0 ${
                                isForecastPathMatch
                                  ? 'h-[2px] bg-[var(--accent-border)]'
                                  : 'h-px bg-[var(--border)]'
                              }`}
                              style={{ width: `${CONDENSED_CONNECTOR_WIDTH / 2}px` }}
                            />
                          ) : null}

                          {showVerticalBridge ? (
                            <>
                              <span
                                className={`pointer-events-none absolute top-1/2 z-0 w-px bg-[var(--border)] ${
                                  startsAtCenter ? '-left-[8px]' : '-right-[8px]'
                                }`}
                                style={{ height: `${bridgeHeight}px` }}
                              />
                              {(isForecastPathMatch || nextIsForecastPathMatch) ? (
                                <span
                                  className={`pointer-events-none absolute z-0 w-[2px] bg-[var(--accent-border)] ${
                                    startsAtCenter ? '-left-[8px]' : '-right-[8px]'
                                  }`}
                                  style={{
                                    top: isForecastPathMatch ? '50%' : `calc(50% + ${highlightedBridgeHalfHeight}px)`,
                                    height: `${highlightedBridgeHalfHeight}px`,
                                  }}
                                />
                              ) : null}
                            </>
                          ) : null}

                          {hasForwardConnection ? (
                            <span
                              className={`pointer-events-none absolute top-1/2 left-full z-0 ${
                                isForecastPathMatch
                                  ? 'h-[2px] bg-[var(--accent-border)]'
                                  : 'h-px bg-[var(--border)]'
                              }`}
                              style={{ width: `${CONDENSED_CONNECTOR_WIDTH / 2}px` }}
                            />
                          ) : null}

                          {isCenterConnectorRound ? (
                            <span
                              className={`pointer-events-none absolute top-1/2 z-0 ${
                                isForecastPathMatch
                                  ? 'h-[2px] bg-[var(--accent-border)]'
                                  : 'h-px bg-[var(--border)]'
                              } ${
                                centerConnectionSide === 'right' ? 'left-full' : '-left-[8px]'
                              }`}
                              style={{ width: `${CONDENSED_CONNECTOR_WIDTH / 2}px` }}
                            />
                          ) : null}

                          {renderCondensedMatchCard(matchId, projectedHomeTeamId, projectedAwayTeamId)}
                        </div>
                      )
                    })
                    })()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const mainRoundMatchIdsById = useMemo(
    () => new Map(mainRounds.map((round) => [round.id, round.matchIds])),
    [mainRounds],
  )
  const standingsByTeamId = useMemo(
    () => new Map(Object.values(groupsById).flatMap((group) => group.standings.map((standing) => [standing.teamId, standing]))),
    [groupsById],
  )
  const positionByMatchId = useMemo(() => {
    const map = new Map<string, BracketParticipantPosition>()

    mainRounds.forEach((round, roundIndex) => {
      round.matchIds.forEach((matchId, slotIndex) => {
        map.set(matchId, {
          roundId: round.id,
          roundIndex,
          matchId,
          slotIndex,
        })
      })
    })

    return map
  }, [mainRounds])
  const matchIdByRoundAndSlot = useMemo(() => {
    const map = new Map<string, string>()

    mainRounds.forEach((round) => {
      round.matchIds.forEach((matchId, slotIndex) => {
        map.set(getRoundSlotKey(round.id, slotIndex), matchId)
      })
    })

    return map
  }, [mainRounds])
  const placeholderResolutionContext: PlaceholderResolutionContext = {
    groupsByIdMap,
    matchesById,
    positionByMatchId,
    matchIdByRoundAndSlot,
    standingsByTeamId,
    teamsById,
  }
  const forecastPath = forecastTeamId
    ? getForecastPathToFinal(forecastTeamId, rounds, placeholderResolutionContext)
    : null
  const forcedWinnerByMatchId = forecastPath?.forcedWinnerByMatchId
  const shouldResolveUnknownTeams = Boolean(forecastTeamId)
  const preFinalRounds = useMemo(
    () => mainRounds.filter((round) => round.id !== 'final'),
    [mainRounds],
  )
  const orderedMainRounds = useMemo(
    () => alignSideRoundsByNextRound(mainRounds, matchesById, mainRoundMatchIdsById),
    [mainRounds, matchesById, mainRoundMatchIdsById],
  )
  const leftSplitBaseRounds = useMemo(
    () =>
      preFinalRounds.map((round) => ({
        ...round,
        matchIds: round.matchIds.slice(0, Math.ceil(round.matchIds.length / 2)),
      })),
    [preFinalRounds],
  )
  const rightSplitBaseRounds = useMemo(
    () =>
      preFinalRounds.map((round) => ({
        ...round,
        matchIds: round.matchIds.slice(Math.ceil(round.matchIds.length / 2)),
      })),
    [preFinalRounds],
  )
  const leftSplitRounds = useMemo(
    () => alignSideRoundsByNextRound(leftSplitBaseRounds, matchesById, mainRoundMatchIdsById),
    [leftSplitBaseRounds, mainRoundMatchIdsById, matchesById],
  )
  const rightSplitRounds = useMemo(
    () => alignSideRoundsByNextRound(rightSplitBaseRounds, matchesById, mainRoundMatchIdsById),
    [rightSplitBaseRounds, mainRoundMatchIdsById, matchesById],
  )
  const rightSplitRoundsFromCenter = useMemo(
    () => [...rightSplitRounds].reverse(),
    [rightSplitRounds],
  )
  const finalMatch = useMemo(() => {
    const finalRound = mainRounds.find((round) => round.id === 'final')
    const finalMatchId = finalRound?.matchIds[0]
    return finalMatchId ? matchesById[finalMatchId] : undefined
  }, [mainRounds, matchesById])
  const finalHomeSemiSourceMatchId = useMemo(
    () => (
      finalMatch
        ? getWinnerSourceMatchId(finalMatch.home, 'semiFinal', mainRoundMatchIdsById)
        : undefined
    ),
    [finalMatch, mainRoundMatchIdsById],
  )
  const finalAwaySemiSourceMatchId = useMemo(
    () => (
      finalMatch
        ? getWinnerSourceMatchId(finalMatch.away, 'semiFinal', mainRoundMatchIdsById)
        : undefined
    ),
    [finalMatch, mainRoundMatchIdsById],
  )
  const condensedOuterRoundMatchCount = useMemo(
    () =>
      Math.max(
        leftSplitRounds[0]?.matchIds.length ?? 0,
        rightSplitRoundsFromCenter[rightSplitRoundsFromCenter.length - 1]?.matchIds.length ?? 0,
      ),
    [leftSplitRounds, rightSplitRoundsFromCenter],
  )
  const condensedTrackHeight = useMemo(
    () =>
      Math.max(
        CONDENSED_NODE_HEIGHT,
        condensedOuterRoundMatchCount * CONDENSED_NODE_HEIGHT +
          Math.max(0, condensedOuterRoundMatchCount - 1) * BASE_GAP,
      ),
    [condensedOuterRoundMatchCount],
  )
  const condensedSemiTopOffset = useMemo(
    () => getRoundMetrics(Math.max(0, preFinalRounds.length - 1), CONDENSED_NODE_HEIGHT).topOffset,
    [preFinalRounds.length],
  )
  const nodeHeight = useMemo(() => Math.max(MIN_NODE_HEIGHT, measuredNodeHeight), [measuredNodeHeight])
  const firstRoundMatchCount = orderedMainRounds.at(0)?.matchIds.length ?? 0
  const boardTrackHeight = Math.max(nodeHeight, firstRoundMatchCount * nodeHeight + Math.max(0, firstRoundMatchCount - 1) * BASE_GAP)

  useLayoutEffect(() => {
    if (!boardRef.current) return

    const mainRoundCards = Array.from(
      boardRef.current.querySelectorAll<HTMLElement>('[data-bracket-main-card="true"]'),
    )

    if (mainRoundCards.length === 0) return

    const maxCardHeight = Math.max(...mainRoundCards.map((card) => card.scrollHeight))
    const nextHeight = Math.max(MIN_NODE_HEIGHT, maxCardHeight)
    setMeasuredNodeHeight((previousHeight) => (previousHeight === nextHeight ? previousHeight : nextHeight))
  }, [orderedMainRounds, locale, t, matchesById, teamsById, groupsById])

  if (viewMode === 'condensed') {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto pb-2 lg:overflow-x-visible">
          <div className="flex min-w-max items-start gap-2 lg:min-w-0 lg:w-full">
            {renderCondensedTreeSide(leftSplitRounds, 'right')}

            <div className="flex w-[112px] min-w-[112px] flex-col lg:min-w-0 lg:flex-1 lg:w-auto">
              <p className="border-b border-[var(--border)] pb-1 text-[10px] font-semibold whitespace-nowrap uppercase tracking-[0.2em] text-[var(--accent-text)]">
                {t.labels.stageFinal}
              </p>
              <div className="relative mt-3" style={{ minHeight: `${condensedTrackHeight}px` }}>
                <div className="absolute left-0 right-0" style={{ top: `${condensedSemiTopOffset}px` }}>
                  <span
                    className={`pointer-events-none absolute top-1/2 -left-2 w-2 ${
                      finalHomeSemiSourceMatchId && (forecastPath?.pathMatchIds.has(finalHomeSemiSourceMatchId) ?? false)
                        ? 'h-[2px] bg-[var(--accent-border)]'
                        : 'h-px bg-[var(--border)]'
                    }`}
                  />
                  <span
                    className={`pointer-events-none absolute top-1/2 -right-2 w-2 ${
                      finalAwaySemiSourceMatchId && (forecastPath?.pathMatchIds.has(finalAwaySemiSourceMatchId) ?? false)
                        ? 'h-[2px] bg-[var(--accent-border)]'
                        : 'h-px bg-[var(--border)]'
                    }`}
                  />
                  {finalMatch ? renderCondensedMatchCard(finalMatch.id) : (
                    <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-2 text-xs text-[var(--text-soft)]">
                      {t.labels.comingSoon}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-2 border-b border-[var(--border)] pb-1 text-[10px] font-semibold whitespace-nowrap uppercase tracking-[0.2em] text-[var(--accent-text)]">
                  {t.labels.stageThirdPlace}
                </p>
                <div className="space-y-2">
                  {thirdPlaceRound?.matchIds.length ? (
                  thirdPlaceRound.matchIds.map((matchId) => renderCondensedMatchCard(matchId))
                  ) : (
                    <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-2 text-xs text-[var(--text-soft)]">
                      {t.labels.comingSoon}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {renderCondensedTreeSide(rightSplitRoundsFromCenter, 'left')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div ref={boardRef} className="flex min-w-full items-start" style={{ gap: `${CONNECTOR_WIDTH}px` }}>
          {orderedMainRounds.map((round, roundIndex) => {
            const metrics = getRoundMetrics(roundIndex, nodeHeight)
            const hasPreviousRound = roundIndex > 0
            const hasNextRound = roundIndex < mainRounds.length - 1
            const isFinalRound = round.id === 'final'

            return (
              <div key={round.id} className="flex min-w-[230px] flex-1 basis-0 flex-col">
                <div className="border-b border-[var(--border)] pb-3">
                  <p className="text-xs font-semibold whitespace-nowrap uppercase tracking-[0.24em] text-[var(--accent-text)]">
                    {getRoundLabel(round.id)}
                  </p>
                </div>

                <div className="relative mt-4" style={{ minHeight: `${boardTrackHeight}px`, paddingTop: `${metrics.topOffset}px` }}>
                  <div className="flex flex-col" style={{ gap: `${metrics.gap}px` }}>
                    {round.matchIds.length > 0 ? (
                      (() => {
                        const projectedTeamIdsInRound = new Set<string>()

                        round.matchIds.forEach((matchId) => {
                          const candidateMatch = matchesById[matchId]
                          if (!candidateMatch) return
                          if (candidateMatch.home.teamId) projectedTeamIdsInRound.add(candidateMatch.home.teamId)
                          if (candidateMatch.away.teamId) projectedTeamIdsInRound.add(candidateMatch.away.teamId)
                        })

                        const resolveProjectedTopTeamId = (
                          participant: ParticipantRef | undefined,
                          shouldProjectParticipant: boolean,
                        ) => {
                          if (!participant?.placeholder || !shouldProjectParticipant) return undefined

                          const projectedTeamId = getProjectedTeamIdFromParticipant(
                            participant,
                            placeholderResolutionContext,
                            new Set(),
                            forcedWinnerByMatchId,
                          )

                          if (!projectedTeamId) return undefined
                          if (!projectedTeamIdsInRound.has(projectedTeamId)) {
                            projectedTeamIdsInRound.add(projectedTeamId)
                            return projectedTeamId
                          }

                          const [placeholderType, placeholderValue] = participant.placeholder.split(':')
                          if (placeholderType !== 'G3') return undefined

                          const fallbackTeamId = placeholderValue
                            .split('')
                            .map((candidateGroupId) => groupsByIdMap.get(candidateGroupId)?.standings[2])
                            .filter((standing): standing is StandingRecord => Boolean(standing))
                            .sort((first, second) => compareStandings(first, second))
                            .map((standing) => standing.teamId)
                            .find((teamId) => !projectedTeamIdsInRound.has(teamId))

                          if (!fallbackTeamId) return undefined
                          projectedTeamIdsInRound.add(fallbackTeamId)
                          return fallbackTeamId
                        }

                        return round.matchIds.map((matchId, matchIndex) => {
                        const match = matchesById[matchId]
                        const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                        const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                        const homePotentialTeamIds =
                          (shouldResolveUnknownTeams || round.id === 'roundOf32') && !homeTeam && match.home.placeholder
                            ? getPotentialTeamsFromPlaceholder(match.home.placeholder, groupsByIdMap)
                            : []
                        const awayPotentialTeamIds =
                          (shouldResolveUnknownTeams || round.id === 'roundOf32') && !awayTeam && match.away.placeholder
                            ? getPotentialTeamsFromPlaceholder(match.away.placeholder, groupsByIdMap)
                            : []
                        const shouldShowHomeRoundOf32GroupTopTeam =
                          round.id === 'roundOf32' &&
                          Boolean(
                            match.home.placeholder?.startsWith('G1:') ||
                              match.home.placeholder?.startsWith('G2:') ||
                              match.home.placeholder?.startsWith('G3:'),
                          )
                        const shouldShowAwayRoundOf32GroupTopTeam =
                          round.id === 'roundOf32' &&
                          Boolean(
                            match.away.placeholder?.startsWith('G1:') ||
                              match.away.placeholder?.startsWith('G2:') ||
                              match.away.placeholder?.startsWith('G3:'),
                          )
                        const homeTopTeamId = !homeTeam && match.home.placeholder
                          ? resolveProjectedTopTeamId(match.home, shouldResolveUnknownTeams || shouldShowHomeRoundOf32GroupTopTeam)
                          : undefined
                        const awayTopTeamId = !awayTeam && match.away.placeholder
                          ? resolveProjectedTopTeamId(match.away, shouldResolveUnknownTeams || shouldShowAwayRoundOf32GroupTopTeam)
                          : undefined
                        const displayedHomeTeamId = homeTeam?.id ?? homeTopTeamId
                        const displayedAwayTeamId = awayTeam?.id ?? awayTopTeamId
                        const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
                        const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
                        const hasFavorite = homeIsFavorite || awayIsFavorite
                        const isForecastPathMatch = forecastPath?.pathMatchIds.has(match.id) ?? false
                        const projectedOpponentTeamId = (
                          forecastTeamId && isForecastPathMatch
                            ? displayedHomeTeamId === forecastTeamId
                              ? displayedAwayTeamId
                              : displayedAwayTeamId === forecastTeamId
                                ? displayedHomeTeamId
                                : forecastPath?.projectedOpponentByMatchId.get(match.id)
                            : forecastPath?.projectedOpponentByMatchId.get(match.id)
                        )
                        const projectedOpponentTeam = projectedOpponentTeamId ? teamsById[projectedOpponentTeamId] : undefined
                        const { localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone)
                        const showVerticalBridge =
                          hasNextRound && matchIndex % 2 === 0 && matchIndex + 1 < round.matchIds.length
                        const nextMatchId = round.matchIds[matchIndex + 1]
                        const nextIsForecastPathMatch = (
                          nextMatchId
                            ? (forecastPath?.pathMatchIds.has(nextMatchId) ?? false)
                            : false
                        )
                        const bridgeHeight = nodeHeight + metrics.gap
                        const highlightedBridgeHalfHeight = bridgeHeight / 2

                        return (
                          <div key={match.id} className="relative">
                            {hasPreviousRound ? (
                              <span
                                className={`pointer-events-none absolute top-1/2 -left-[16px] z-0 ${
                                  isForecastPathMatch
                                    ? 'h-[2px] bg-[var(--accent-border)]'
                                    : 'h-px bg-[var(--border)]'
                                }`}
                                style={{ width: `${CONNECTOR_WIDTH / 2}px` }}
                              />
                            ) : null}

                            {showVerticalBridge ? (
                              <>
                                <span
                                  className="pointer-events-none absolute top-1/2 -right-[16px] z-0 w-px bg-[var(--border)]"
                                  style={{ height: `${bridgeHeight}px` }}
                                />
                                {(isForecastPathMatch || nextIsForecastPathMatch) ? (
                                  <span
                                    className="pointer-events-none absolute -right-[16px] z-0 w-[2px] bg-[var(--accent-border)]"
                                    style={{
                                      top: isForecastPathMatch ? '50%' : `calc(50% + ${highlightedBridgeHalfHeight}px)`,
                                      height: `${highlightedBridgeHalfHeight}px`,
                                    }}
                                  />
                                ) : null}
                              </>
                            ) : null}

                            {hasNextRound ? (
                              <span
                                className={`pointer-events-none absolute top-1/2 left-full z-0 ${
                                  isForecastPathMatch
                                    ? 'h-[2px] bg-[var(--accent-border)]'
                                    : 'h-px bg-[var(--border)]'
                                }`}
                                style={{ width: `${CONNECTOR_WIDTH / 2}px` }}
                              />
                            ) : null}

                            <div
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  setSelectedMatchId(match.id)
                                }
                              }}
                              className={`relative z-10 cursor-pointer overflow-hidden rounded-[var(--radius-sm)] bg-[var(--surface)] p-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                              hasFavorite
                                ? 'bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)] before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--accent)]'
                                : 'hover:bg-[var(--surface-soft)]'
                              } ${isForecastPathMatch ? 'ring-2 ring-[var(--accent-border)] ring-inset' : ''}`}
                              data-bracket-main-card="true"
                              style={{ minHeight: `${nodeHeight}px` }}
                              onClick={() => setSelectedMatchId(match.id)}
                            >
                              <div className="space-y-2">
                                <div className="flex min-w-0 items-center gap-2.5 border-b border-[var(--border)] pb-2">
                                  {homeTeam ? (
                                    renderKnownTeamAvatar(homeTeam.id)
                                  ) : (
                                    renderPotentialTeamAvatar(homeTopTeamId)
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="inline-flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                      <span className="truncate">
                                        {homeTeam
                                        ? t.teams[homeTeam.id] ?? homeTeam.name
                                          : formatBracketPlaceholder(match.home.placeholder!, round.id)}
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
                                    renderKnownTeamAvatar(awayTeam.id)
                                  ) : (
                                    renderPotentialTeamAvatar(awayTopTeamId)
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="inline-flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                      <span className="truncate">
                                        {awayTeam
                                        ? t.teams[awayTeam.id] ?? awayTeam.name
                                          : formatBracketPlaceholder(match.away.placeholder!, round.id)}
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

                              {isForecastPathMatch ? (
                                <div className="mt-2 truncate border-t border-[var(--border)] pt-2 text-xs font-medium text-[var(--accent-text)]">
                                  {t.labels.bracketPathOpponent}: {projectedOpponentTeam ? (t.teams[projectedOpponentTeam.id] ?? projectedOpponentTeam.name) : t.labels.tbd}
                                </div>
                              ) : null}

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
                      })()
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
                        const homePotentialTeamIds =
                          shouldResolveUnknownTeams && !homeTeam && match.home.placeholder
                            ? getPotentialTeamsFromPlaceholder(match.home.placeholder, groupsByIdMap)
                            : []
                        const awayPotentialTeamIds =
                          shouldResolveUnknownTeams && !awayTeam && match.away.placeholder
                            ? getPotentialTeamsFromPlaceholder(match.away.placeholder, groupsByIdMap)
                            : []
                        const homeTopTeamId = !homeTeam && match.home.placeholder
                          ? shouldResolveUnknownTeams
                            ? getProjectedTeamIdFromParticipant(match.home, placeholderResolutionContext, new Set(), forcedWinnerByMatchId)
                            : undefined
                          : undefined
                        const awayTopTeamId = !awayTeam && match.away.placeholder
                          ? shouldResolveUnknownTeams
                            ? getProjectedTeamIdFromParticipant(match.away, placeholderResolutionContext, new Set(), forcedWinnerByMatchId)
                            : undefined
                          : undefined
                        const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
                        const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
                        const hasFavorite = homeIsFavorite || awayIsFavorite
                        const { localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone)

                        return (
                          <div
                           key={match.id}
                           role="button"
                           tabIndex={0}
                           onKeyDown={(event) => {
                             if (event.key === 'Enter' || event.key === ' ') {
                               event.preventDefault()
                               setSelectedMatchId(match.id)
                             }
                           }}
                           className={`relative cursor-pointer rounded-[var(--radius-sm)] bg-[var(--surface)] p-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                           hasFavorite
                             ? 'bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)] before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--accent)]'
                             : 'hover:bg-[var(--surface-soft)]'
                          }`}
                          onClick={() => setSelectedMatchId(match.id)}>
                           <div className="space-y-2">
                              <div className="flex min-w-0 items-center gap-2.5 border-b border-[var(--border)] pb-2">
                                {homeTeam ? (
                                  renderKnownTeamAvatar(homeTeam.id)
                                ) : (
                                  renderPotentialTeamAvatar(homeTopTeamId)
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="inline-flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                    <span className="truncate">
                                      {homeTeam
                                        ? t.teams[homeTeam.id] ?? homeTeam.name
                                        : formatBracketPlaceholder(match.home.placeholder!, thirdPlaceRound.id)}
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
                                  renderKnownTeamAvatar(awayTeam.id)
                                ) : (
                                  renderPotentialTeamAvatar(awayTopTeamId)
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="inline-flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                    <span className="truncate">
                                      {awayTeam
                                        ? t.teams[awayTeam.id] ?? awayTeam.name
                                        : formatBracketPlaceholder(match.away.placeholder!, thirdPlaceRound.id)}
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
  )
}
