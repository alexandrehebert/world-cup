import type {
  BracketRoundRecord,
  GroupRecord,
  MatchRecord,
  TeamRecord,
  TournamentData,
} from '../types/tournament'

export interface TournamentModel extends TournamentData {
  teamsById: Record<string, TeamRecord>
  groupsById: Record<string, GroupRecord>
  matchesById: Record<string, MatchRecord>
  roundsById: Record<string, BracketRoundRecord>
  upcomingMatches: MatchRecord[]
}

export const buildTournamentModel = (data: TournamentData): TournamentModel => {
  const teamsById = Object.fromEntries(data.teams.map((team) => [team.id, team]))
  const groupsById = Object.fromEntries(data.groups.map((group) => [group.id, group]))
  const matchesById = Object.fromEntries(data.matches.map((match) => [match.id, match]))
  const roundsById = Object.fromEntries(data.bracketRounds.map((round) => [round.id, round]))
  const upcomingMatches = [...data.matches].sort((first, second) => first.kickoff.localeCompare(second.kickoff))

  return {
    ...data,
    teamsById,
    groupsById,
    matchesById,
    roundsById,
    upcomingMatches,
  }
}
