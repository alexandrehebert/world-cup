import type { CompetitionId } from '../competitions/types'

const STANDINGS_SECTION_COMPETITION_IDS: CompetitionId[] = [
  'nations-championship-2026',
  'six-nations-championship-2025',
  'six-nations-championship-2026',
]
const FINAL_PHASE_SECTION_COMPETITION_IDS: CompetitionId[] = [
  'nations-championship-2026',
]

export const usesStandingsSectionPath = (competitionId: CompetitionId) => {
  return STANDINGS_SECTION_COMPETITION_IDS.includes(competitionId)
}

export const getStandingsSectionPath = (competitionId: CompetitionId) => {
  return usesStandingsSectionPath(competitionId) ? '/standings' : '/groups'
}

export const getStandingsSectionSlug = (competitionId: CompetitionId) => {
  return usesStandingsSectionPath(competitionId) ? 'standings' : 'groups'
}

export const hidesGroupStageLabel = (competitionId: CompetitionId) => {
  return usesStandingsSectionPath(competitionId)
}

export const supportsTeamEliminationFilter = (competitionId: CompetitionId) => {
  return !usesStandingsSectionPath(competitionId)
}

export const usesFinalPhaseSectionPath = (competitionId: CompetitionId) => {
  return FINAL_PHASE_SECTION_COMPETITION_IDS.includes(competitionId)
}
