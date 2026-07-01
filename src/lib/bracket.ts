import type { BracketRoundRecord, GroupRecord, MatchRecord, ParticipantRef } from '../types/tournament'
import { getMatchWinner } from './format'
import { compareStandings } from './standings'

const isGroupComplete = (group: GroupRecord, matches: MatchRecord[]): boolean => {
  const groupMatches = matches.filter((m) => m.stage === 'group' && m.groupId === group.id)
  // Expect all round-robin matches to be finished: N teams → N*(N-1)/2 matches
  const expectedMatchCount = (group.teamIds.length * (group.teamIds.length - 1)) / 2
  const hasAllFinishedMatches =
    groupMatches.length === expectedMatchCount && groupMatches.every((m) => m.status === 'finished')

  // Fallback for stale match statuses: if standings already show every team completed
  // its full group schedule, treat the group as complete for bracket resolution.
  const expectedPlayedMatchesPerTeam = Math.max(0, group.teamIds.length - 1)
  const hasCompleteStandings =
    group.standings.length === group.teamIds.length &&
    group.standings.every((standing) => standing.played >= expectedPlayedMatchesPerTeam)

  return hasAllFinishedMatches || hasCompleteStandings
}

/**
 * Resolves a G1:X or G2:X placeholder to a team ID when the group is fully complete.
 * Returns undefined if the group is not complete or the placeholder is not a G1/G2 type.
 */
export const resolveG1G2Placeholder = (
  placeholder: string,
  groupsById: Map<string, GroupRecord>,
  matches: MatchRecord[],
): string | undefined => {
  const [type, groupId] = placeholder.split(':')

  if (type !== 'G1' && type !== 'G2') return undefined

  const group = groupsById.get(groupId)
  if (!group || !isGroupComplete(group, matches)) return undefined

  const positionIndex = type === 'G1' ? 0 : 1
  return group.standings[positionIndex]?.teamId
}

const resolveG3Placeholder = (
  placeholder: string,
  groupsById: Map<string, GroupRecord>,
  matches: MatchRecord[],
): string | undefined => {
  const [type, groupIds] = placeholder.split(':')
  if (type !== 'G3' || !groupIds) return undefined

  const candidateGroups = groupIds
    .split('')
    .map((groupId) => groupsById.get(groupId))
    .filter((group): group is GroupRecord => Boolean(group))

  if (candidateGroups.length !== groupIds.length) return undefined
  if (!candidateGroups.every((group) => isGroupComplete(group, matches))) return undefined

  const projectedThirdPlaces = candidateGroups
    .map((group) => group.standings[2])
    .filter((standing): standing is NonNullable<GroupRecord['standings'][number]> => Boolean(standing))

  if (projectedThirdPlaces.length === 0) return undefined

  projectedThirdPlaces.sort((first, second) => compareStandings(first, second))
  return projectedThirdPlaces[0]?.teamId
}

const resolveGroupStagePlaceholder = (
  placeholder: string,
  groupsById: Map<string, GroupRecord>,
  matches: MatchRecord[],
): string | undefined => {
  if (placeholder.startsWith('G1:') || placeholder.startsWith('G2:')) {
    return resolveG1G2Placeholder(placeholder, groupsById, matches)
  }

  if (placeholder.startsWith('G3:')) {
    return resolveG3Placeholder(placeholder, groupsById, matches)
  }

  return undefined
}

/**
 * Gets the potential team IDs from a G1:X or G2:X placeholder.
 * Returns all teams in the referenced group.
 */
export const getPotentialTeamsFromPlaceholder = (
  placeholder: string,
  groupsById: Map<string, GroupRecord>,
): string[] => {
  const [type, groupId] = placeholder.split(':')

  if (type === 'G3') {
    const projectedThirdPlaces = groupId
      .split('')
      .map((candidateGroupId) => groupsById.get(candidateGroupId)?.standings[2])
      .filter((standing): standing is NonNullable<GroupRecord['standings'][number]> => Boolean(standing))

    if (projectedThirdPlaces.length === 0) return []

    projectedThirdPlaces.sort((first, second) => compareStandings(first, second))
    return projectedThirdPlaces.slice(0, 4).map((standing) => standing.teamId)
  }

  if (type !== 'G1' && type !== 'G2') return []

  const group = groupsById.get(groupId)
  if (!group) return []

  return group.teamIds
}

/**
 * Gets the team currently in the position specified by the placeholder (1st or 2nd).
 * Returns the teamId if the group has standings, undefined otherwise.
 */
export const getTopTeamFromPlaceholder = (
  placeholder: string,
  groupsById: Map<string, GroupRecord>,
): string | undefined => {
  const [type, groupId] = placeholder.split(':')

  if (type === 'G3') {
    const projectedThirdPlaces = groupId
      .split('')
      .map((candidateGroupId) => groupsById.get(candidateGroupId)?.standings[2])
      .filter((standing): standing is NonNullable<GroupRecord['standings'][number]> => Boolean(standing))

    if (projectedThirdPlaces.length === 0) return undefined

    projectedThirdPlaces.sort((first, second) => compareStandings(first, second))
    return projectedThirdPlaces[0]?.teamId
  }

  if (type !== 'G1' && type !== 'G2') return undefined

  const group = groupsById.get(groupId)
  if (!group || group.standings.length === 0) return undefined

  const positionIndex = type === 'G1' ? 0 : 1
  return group.standings[positionIndex]?.teamId
}

const getBracketRoundSlotKey = (roundId: string, slotIndex: number) => `${roundId}:${slotIndex}`

const getBracketMatchIdByRoundAndSlot = (
  matches: MatchRecord[],
  bracketRounds?: BracketRoundRecord[],
) => {
  const matchIdByRoundAndSlot = new Map<string, string>()

  if (bracketRounds?.length) {
    bracketRounds.forEach((round) => {
      round.matchIds.forEach((matchId, slotIndex) => {
        matchIdByRoundAndSlot.set(getBracketRoundSlotKey(round.id, slotIndex), matchId)
      })
    })

    return matchIdByRoundAndSlot
  }

  const matchIdsByRoundId = new Map<string, string[]>()
  matches.forEach((match) => {
    if (match.stage === 'group') return

    const roundId = match.roundId ?? match.stage
    const matchIds = matchIdsByRoundId.get(roundId) ?? []
    matchIds.push(match.id)
    matchIdsByRoundId.set(roundId, matchIds)
  })

  matchIdsByRoundId.forEach((matchIds, roundId) => {
    matchIds.forEach((matchId, slotIndex) => {
      matchIdByRoundAndSlot.set(getBracketRoundSlotKey(roundId, slotIndex), matchId)
    })
  })

  return matchIdByRoundAndSlot
}

const resolveKnockoutPlaceholder = (
  participant: ParticipantRef | undefined,
  groupsById: Map<string, GroupRecord>,
  matches: MatchRecord[],
  matchesById: Map<string, MatchRecord>,
  matchIdByRoundAndSlot: Map<string, string>,
  visitedPlaceholders: Set<string> = new Set(),
): string | undefined => {
  if (!participant) return undefined
  if (participant.teamId) return participant.teamId
  if (!participant.placeholder) return undefined

  const placeholder = participant.placeholder
  if (visitedPlaceholders.has(placeholder)) return undefined

  const nextVisitedPlaceholders = new Set(visitedPlaceholders)
  nextVisitedPlaceholders.add(placeholder)

  const [type, roundId, rawSlotIndex] = placeholder.split(':')

  if (type === 'G1' || type === 'G2' || type === 'G3') {
    return resolveGroupStagePlaceholder(placeholder, groupsById, matches)
  }

  if (type !== 'W' && type !== 'L') {
    return undefined
  }

  const parsedSlotIndex = Number.parseInt(rawSlotIndex ?? '', 10)
  if (!roundId || !Number.isInteger(parsedSlotIndex) || parsedSlotIndex <= 0) {
    return undefined
  }

  const sourceMatchId = matchIdByRoundAndSlot.get(getBracketRoundSlotKey(roundId, parsedSlotIndex - 1))
  if (!sourceMatchId) return undefined

  const sourceMatch = matchesById.get(sourceMatchId)
  if (!sourceMatch) return undefined

  const winnerSide = getMatchWinner(sourceMatch)
  if (!winnerSide) return undefined

  const homeTeamId = resolveKnockoutPlaceholder(
    sourceMatch.home,
    groupsById,
    matches,
    matchesById,
    matchIdByRoundAndSlot,
    nextVisitedPlaceholders,
  )
  const awayTeamId = resolveKnockoutPlaceholder(
    sourceMatch.away,
    groupsById,
    matches,
    matchesById,
    matchIdByRoundAndSlot,
    nextVisitedPlaceholders,
  )

  if (!homeTeamId || !awayTeamId) return undefined

  if (type === 'W') {
    return winnerSide === 'home' ? homeTeamId : awayTeamId
  }

  return winnerSide === 'home' ? awayTeamId : homeTeamId
}

/**
 * Iterates over all bracket matches and fills in known team IDs from completed group standings.
 * Resolves deterministic bracket participants:
 * - G1/G2 placeholders when their group is complete
 * - G3 placeholders once all referenced groups are complete
 * - W/L placeholders when the source knockout match is finished
 */
export const resolveGroupBracketTeams = (
  matches: MatchRecord[],
  groups: GroupRecord[],
  bracketRounds?: BracketRoundRecord[],
): MatchRecord[] => {
  const groupsById = new Map(groups.map((g) => [g.id, g]))
  const matchesWithGroupTeams = matches.map((match) => {
    if (match.stage === 'group') return match

    const resolvedHomeTeamId =
      match.home && !match.home.teamId && match.home.placeholder
        ? resolveGroupStagePlaceholder(match.home.placeholder, groupsById, matches)
        : undefined

    const resolvedAwayTeamId =
      match.away && !match.away.teamId && match.away.placeholder
        ? resolveGroupStagePlaceholder(match.away.placeholder, groupsById, matches)
        : undefined

    if (!resolvedHomeTeamId && !resolvedAwayTeamId) return match

    return {
      ...match,
      home: resolvedHomeTeamId ? { ...match.home, teamId: resolvedHomeTeamId } : match.home,
      away: resolvedAwayTeamId ? { ...match.away, teamId: resolvedAwayTeamId } : match.away,
    }
  })

  const matchesById = new Map(matchesWithGroupTeams.map((match) => [match.id, match]))
  const matchIdByRoundAndSlot = getBracketMatchIdByRoundAndSlot(matchesWithGroupTeams, bracketRounds)

  return matchesWithGroupTeams.map((match) => {
    if (match.stage === 'group') return match

    const resolvedHomeTeamId = !match.home.teamId
      ? resolveKnockoutPlaceholder(match.home, groupsById, matchesWithGroupTeams, matchesById, matchIdByRoundAndSlot)
      : undefined
    const resolvedAwayTeamId = !match.away.teamId
      ? resolveKnockoutPlaceholder(match.away, groupsById, matchesWithGroupTeams, matchesById, matchIdByRoundAndSlot)
      : undefined

    if (!resolvedHomeTeamId && !resolvedAwayTeamId) return match

    return {
      ...match,
      home: resolvedHomeTeamId ? { ...match.home, teamId: resolvedHomeTeamId } : match.home,
      away: resolvedAwayTeamId ? { ...match.away, teamId: resolvedAwayTeamId } : match.away,
    }
  })
}
