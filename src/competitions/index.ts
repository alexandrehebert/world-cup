import type { CompetitionId, CompetitionProfile } from './types'
import { nationsChampionship2026Competition } from './nations-championship-2026'
import { worldCup2026Competition } from './world-cup-2026'

const DEFAULT_COMPETITION_ID: CompetitionId = 'world-cup-2026'

const competitionById: Record<CompetitionId, CompetitionProfile> = {
  'world-cup-2026': worldCup2026Competition,
  'nations-championship-2026': nationsChampionship2026Competition,
}
const allCompetitions = Object.values(competitionById)

const normalizeCompetitionId = (value: string | undefined): CompetitionId | undefined => {
  if (!value) {
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  if (normalized === 'world-cup-2026' || normalized === 'nations-championship-2026') {
    return normalized
  }

  return undefined
}

export const resolveCompetitionId = (value: string | undefined): CompetitionId => {
  return normalizeCompetitionId(value) ?? DEFAULT_COMPETITION_ID
}

export const getCompetitionProfile = (competitionId: CompetitionId): CompetitionProfile => {
  return competitionById[competitionId]
}

export const getActiveCompetitionProfile = () => {
  const competitionId = resolveCompetitionId(process.env.COMPETITION_ID ?? process.env.NEXT_PUBLIC_COMPETITION_ID)
  return getCompetitionProfile(competitionId)
}

export const listCompetitionProfiles = () => allCompetitions
