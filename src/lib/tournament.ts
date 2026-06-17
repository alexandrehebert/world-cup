import type {
  BracketRoundRecord,
  GroupRecord,
  MatchRecord,
  TeamRecord,
  TournamentData,
} from '../types/tournament'
import { compareStandings } from './standings'

export interface TournamentModel extends TournamentData {
  teamsById: Record<string, TeamRecord>
  groupsById: Record<string, GroupRecord>
  matchesById: Record<string, MatchRecord>
  roundsById: Record<string, BracketRoundRecord>
  upcomingMatches: MatchRecord[]
}

export const buildTournamentModel = (data: TournamentData): TournamentModel => {
  const teamsById = Object.fromEntries(data.teams.map((team) => [team.id, team]))
  const groups = data.groups.map((group) => {
    const originalOrder = new Map(group.standings.map((standing, index) => [standing.teamId, index]))
    const standings = [...group.standings].sort((first, second) => {
      const ranking = compareStandings(first, second)
      if (ranking !== 0) {
        return ranking
      }

      return (originalOrder.get(first.teamId) ?? 0) - (originalOrder.get(second.teamId) ?? 0)
    })

    return {
      ...group,
      standings,
    }
  })
  const groupsById = Object.fromEntries(groups.map((group) => [group.id, group]))
  const matchesById = Object.fromEntries(data.matches.map((match) => [match.id, match]))
  const roundsById = Object.fromEntries(data.bracketRounds.map((round) => [round.id, round]))
  const upcomingMatches = [...data.matches].sort((first, second) => first.kickoff.localeCompare(second.kickoff))

  return {
    ...data,
    groups,
    teamsById,
    groupsById,
    matchesById,
    roundsById,
    upcomingMatches,
  }
}
