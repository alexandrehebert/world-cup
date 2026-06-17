import type { MatchRecord, StandingRecord } from '../types/tournament'

export const compareStandings = (first: StandingRecord, second: StandingRecord): number => {
  if (second.points !== first.points) {
    return second.points - first.points
  }

  const firstGoalDifference = first.goalsFor - first.goalsAgainst
  const secondGoalDifference = second.goalsFor - second.goalsAgainst

  if (secondGoalDifference !== firstGoalDifference) {
    return secondGoalDifference - firstGoalDifference
  }

  if (second.goalsFor !== first.goalsFor) {
    return second.goalsFor - first.goalsFor
  }

  return 0
}

type TeamMetrics = Pick<StandingRecord, 'points' | 'goalsFor' | 'goalsAgainst'>

type SortGroupStandingsInput = {
  standings: StandingRecord[]
  matches: MatchRecord[]
  originalOrder?: Map<string, number>
}

const hasNumericScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const getGoalDifference = (standing: TeamMetrics): number => standing.goalsFor - standing.goalsAgainst

const defaultMetrics: TeamMetrics = {
  points: 0,
  goalsFor: 0,
  goalsAgainst: 0,
}

const criteria = [
  (standing: TeamMetrics) => standing.points,
  (standing: TeamMetrics) => getGoalDifference(standing),
  (standing: TeamMetrics) => standing.goalsFor,
]

const splitByCriterion = (
  teamIds: string[],
  getMetrics: (teamId: string) => TeamMetrics,
  getCriterionValue: (standing: TeamMetrics) => number,
  fallbackOrder: Map<string, number>,
) => {
  const sorted = [...teamIds].sort((first, second) => {
    const difference = getCriterionValue(getMetrics(second)) - getCriterionValue(getMetrics(first))
    if (difference !== 0) {
      return difference
    }

    return (fallbackOrder.get(first) ?? Number.MAX_SAFE_INTEGER) - (fallbackOrder.get(second) ?? Number.MAX_SAFE_INTEGER)
  })

  const buckets: string[][] = []
  for (const teamId of sorted) {
    const lastBucket = buckets.at(-1)
    if (!lastBucket || getCriterionValue(getMetrics(lastBucket[0])) !== getCriterionValue(getMetrics(teamId))) {
      buckets.push([teamId])
      continue
    }

    lastBucket.push(teamId)
  }

  return buckets
}

const rankByCriteria = (
  teamIds: string[],
  getMetrics: (teamId: string) => TeamMetrics,
  fallbackOrder: Map<string, number>,
  onUnresolvedTie: (teamIds: string[]) => string[],
) => {
  let groups = [teamIds]

  for (const criterion of criteria) {
    groups = groups.flatMap((group) => (group.length <= 1 ? [group] : splitByCriterion(group, getMetrics, criterion, fallbackOrder)))
  }

  return groups.flatMap((group) => (group.length <= 1 ? group : onUnresolvedTie(group)))
}

const buildHeadToHeadMetrics = (teamIds: string[], matches: MatchRecord[]) => {
  const teamSet = new Set(teamIds)
  const metricsByTeamId = new Map(
    teamIds.map((teamId) => [
      teamId,
      {
        ...defaultMetrics,
      },
    ]),
  )

  for (const match of matches) {
    if (match.stage !== 'group' || match.status !== 'finished') {
      continue
    }

    const homeId = match.home?.teamId
    const awayId = match.away?.teamId
    const homeScore = match.home?.score
    const awayScore = match.away?.score

    if (!homeId || !awayId || !teamSet.has(homeId) || !teamSet.has(awayId)) {
      continue
    }

    if (!hasNumericScore(homeScore) || !hasNumericScore(awayScore)) {
      continue
    }

    const home = metricsByTeamId.get(homeId)
    const away = metricsByTeamId.get(awayId)

    if (!home || !away) {
      continue
    }

    home.goalsFor += homeScore
    home.goalsAgainst += awayScore
    away.goalsFor += awayScore
    away.goalsAgainst += homeScore

    if (homeScore > awayScore) {
      home.points += 3
    } else if (homeScore < awayScore) {
      away.points += 3
    } else {
      home.points += 1
      away.points += 1
    }
  }

  return metricsByTeamId
}

const rankByHeadToHead = (teamIds: string[], matches: MatchRecord[], fallbackOrder: Map<string, number>): string[] => {
  if (teamIds.length <= 1) {
    return teamIds
  }

  const headToHeadMetrics = buildHeadToHeadMetrics(teamIds, matches)
  return rankByCriteria(
    teamIds,
    (teamId) => headToHeadMetrics.get(teamId) ?? defaultMetrics,
    fallbackOrder,
    (stillTiedTeamIds) => {
      if (stillTiedTeamIds.length === teamIds.length) {
        return [...stillTiedTeamIds].sort(
          (first, second) =>
            (fallbackOrder.get(first) ?? Number.MAX_SAFE_INTEGER) - (fallbackOrder.get(second) ?? Number.MAX_SAFE_INTEGER),
        )
      }

      return rankByHeadToHead(stillTiedTeamIds, matches, fallbackOrder)
    },
  )
}

export const sortGroupStandings = ({ standings, matches, originalOrder }: SortGroupStandingsInput): StandingRecord[] => {
  const fallbackOrder = new Map(standings.map((standing, index) => [standing.teamId, originalOrder?.get(standing.teamId) ?? index]))
  const standingsByTeamId = new Map(standings.map((standing) => [standing.teamId, standing]))
  const rankedTeamIds = rankByCriteria(
    standings.map((standing) => standing.teamId),
    (teamId) => standingsByTeamId.get(teamId) ?? defaultMetrics,
    fallbackOrder,
    (tiedTeamIds) => rankByHeadToHead(tiedTeamIds, matches, fallbackOrder),
  )

  return rankedTeamIds
    .map((teamId) => standingsByTeamId.get(teamId))
    .filter((standing): standing is StandingRecord => Boolean(standing))
}
