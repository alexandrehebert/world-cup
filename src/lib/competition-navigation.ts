import type { CompetitionId } from '../competitions/types'
import { parseCompetitionId } from '../competitions'

const COMPETITION_ID_WITH_YEAR_REGEX = /^(.*)-(\d{4})$/
const DISPLAY_NAME_WITH_YEAR_REGEX = /^(.*)\s(\d{4})$/
const COMPETITION_YEAR_ONLY_FRAGMENT_REGEX = /^#?(\d{4})$/
const COMPETITION_LEGACY_YEAR_FRAGMENT_REGEX = /^#?(\d{4})-([a-z0-9-]+)$/

export type CompetitionSeasonDetails = {
  familyId: string
  year: number | null
}

export const getCompetitionSeasonDetails = (competitionId: CompetitionId): CompetitionSeasonDetails => {
  const match = competitionId.match(COMPETITION_ID_WITH_YEAR_REGEX)
  if (!match) {
    return {
      familyId: competitionId,
      year: null,
    }
  }

  return {
    familyId: match[1],
    year: Number.parseInt(match[2], 10),
  }
}

export const getCompetitionFamilyLabel = (displayName: string): string => {
  const trimmed = displayName.trim()
  const match = trimmed.match(DISPLAY_NAME_WITH_YEAR_REGEX)

  return match ? match[1] : trimmed
}

export const buildCompetitionYearFragment = (
  competitionId: CompetitionId,
  mostRecentYearByFamily: Readonly<Record<string, number | undefined>>,
): string | null => {
  const { familyId, year } = getCompetitionSeasonDetails(competitionId)
  const mostRecentYear = mostRecentYearByFamily[familyId]

  if (year === null || mostRecentYear === undefined || year >= mostRecentYear) {
    return null
  }

  return String(year)
}

export const buildCompetitionSwitcherPath = (yearFragment: string | null): string => {
  return yearFragment ? `/#${yearFragment}` : '/'
}

export const parseCompetitionIdFromFragment = (
  fragment: string,
  baseCompetitionId?: CompetitionId,
): CompetitionId | undefined => {
  const normalizedFragment = fragment.trim().toLowerCase()
  const yearOnlyMatch = normalizedFragment.match(COMPETITION_YEAR_ONLY_FRAGMENT_REGEX)

  if (yearOnlyMatch && baseCompetitionId) {
    const { familyId } = getCompetitionSeasonDetails(baseCompetitionId)
    return parseCompetitionId(`${familyId}-${yearOnlyMatch[1]}`)
  }

  const legacyMatch = normalizedFragment.match(COMPETITION_LEGACY_YEAR_FRAGMENT_REGEX)

  if (!legacyMatch) {
    return undefined
  }

  return parseCompetitionId(`${legacyMatch[2]}-${legacyMatch[1]}`)
}
