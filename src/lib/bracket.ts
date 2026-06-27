import type { GroupRecord, MatchRecord } from '../types/tournament'
import { compareStandings } from './standings'

const isGroupComplete = (group: GroupRecord, matches: MatchRecord[]): boolean => {
  const groupMatches = matches.filter((m) => m.stage === 'group' && m.groupId === group.id)
  // Expect all round-robin matches to be finished: N teams → N*(N-1)/2 matches
  const expectedMatchCount = (group.teamIds.length * (group.teamIds.length - 1)) / 2
  return groupMatches.length === expectedMatchCount && groupMatches.every((m) => m.status === 'finished')
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

/**
 * Iterates over all bracket matches and fills in known team IDs from completed group standings.
 * Only resolves G1/G2 placeholders (1st/2nd place of a specific group).
 * G3 (best 3rd-place) placeholders are left for ESPN or manual resolution.
 */
export const resolveGroupBracketTeams = (matches: MatchRecord[], groups: GroupRecord[]): MatchRecord[] => {
  const groupsById = new Map(groups.map((g) => [g.id, g]))

  return matches.map((match) => {
    if (match.stage === 'group') return match

    const resolvedHomeTeamId =
      match.home && !match.home.teamId && match.home.placeholder
        ? resolveG1G2Placeholder(match.home.placeholder, groupsById, matches)
        : undefined

    const resolvedAwayTeamId =
      match.away && !match.away.teamId && match.away.placeholder
        ? resolveG1G2Placeholder(match.away.placeholder, groupsById, matches)
        : undefined

    if (!resolvedHomeTeamId && !resolvedAwayTeamId) return match

    return {
      ...match,
      home: resolvedHomeTeamId ? { ...match.home, teamId: resolvedHomeTeamId } : match.home,
      away: resolvedAwayTeamId ? { ...match.away, teamId: resolvedAwayTeamId } : match.away,
    }
  })
}
