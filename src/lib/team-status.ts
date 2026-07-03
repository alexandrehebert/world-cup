import { getDisplayMatchStatus, getMatchWinner } from './format'
import { resolveCompetitionId } from '../competitions'
import { usesStandingsSectionPath } from './competition-sections'
import type { GroupRecord, MatchRecord } from '../types/tournament'

export const isTeamEliminated = ({
  teamId,
  matches,
  nowMs,
  competitionId,
  groups = [],
}: {
  teamId: string
  matches: MatchRecord[]
  nowMs: number
  competitionId?: string
  groups?: GroupRecord[]
}) => {
  const resolvedCompetitionId = resolveCompetitionId(competitionId)
  const isStandingsCompetition = usesStandingsSectionPath(resolvedCompetitionId)
  void groups

  if (isStandingsCompetition) {
    return false
  }

  const teamMatches = matches
    .filter((match) => match.home.teamId === teamId || match.away.teamId === teamId)
    .sort((first, second) => first.kickoff.localeCompare(second.kickoff))
  const nextMatch = teamMatches.find((match) => getDisplayMatchStatus(match, nowMs) !== 'finished')
  const latestMatch = teamMatches.length > 0 ? teamMatches[teamMatches.length - 1] : null
  const latestStatus = latestMatch ? getDisplayMatchStatus(latestMatch, nowMs) : null
  const latestWinner = latestMatch ? getMatchWinner(latestMatch, nowMs) : null
  const isLatestHome = latestMatch?.home.teamId === teamId
  const isLatestWinner = latestWinner ? (isLatestHome ? latestWinner === 'home' : latestWinner === 'away') : false
  const isChampion = Boolean(latestMatch && latestMatch.stage === 'final' && latestStatus === 'finished' && isLatestWinner)

  return !nextMatch && Boolean(latestMatch) && latestStatus === 'finished' && !isChampion
}
