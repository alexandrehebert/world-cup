import type { StandingRecord } from '../types/tournament'

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

  if (first.goalsAgainst !== second.goalsAgainst) {
    return first.goalsAgainst - second.goalsAgainst
  }

  return 0
}
