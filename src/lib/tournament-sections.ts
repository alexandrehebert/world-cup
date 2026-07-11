import type { TournamentData } from '../types/tournament'

export const hasGroupsSection = (groups: TournamentData['groups']) => {
  return groups.length > 0
}

export const hasBracketSection = (bracketRounds: TournamentData['bracketRounds']) => {
  return bracketRounds.some((round) => round.matchIds.length > 0)
}

export const hasFinalPhaseSection = (groups: TournamentData['groups']) => {
  return groups.length === 2 && groups.every((group) => group.standings.length > 0)
}
