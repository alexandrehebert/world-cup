import type {
  BracketRoundRecord,
  GroupRecord,
  MatchRecord,
  TeamRecord,
  TournamentData,
} from '../types/tournament'
import { resolveGroupBracketTeams } from './bracket'
import { sortGroupStandings } from './standings'

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
    const standings = sortGroupStandings({
      standings: group.standings,
      matches: data.matches.filter((match) => match.stage === 'group' && match.groupId === group.id),
      originalOrder,
    })

    return {
      ...group,
      standings,
    }
  })
  const groupsById = Object.fromEntries(groups.map((group) => [group.id, group]))
  const matches = resolveGroupBracketTeams(data.matches, groups)
  const matchesById = Object.fromEntries(matches.map((match) => [match.id, match]))
  const roundsById = Object.fromEntries(data.bracketRounds.map((round) => [round.id, round]))
  const upcomingMatches = [...matches].sort((first, second) => first.kickoff.localeCompare(second.kickoff))

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
