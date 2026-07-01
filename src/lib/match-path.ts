import type { MatchRecord } from '../types/tournament'

export type MatchPathSection = 'match' | 'bracket' | 'predict'

export type BracketRoundId = 'roundOf32' | 'roundOf16' | 'quarterFinal' | 'semiFinal' | 'final' | 'thirdPlace'

const MATCH_STAGE_SLUGS = {
  group: 'group',
  roundOf32: 'round-of-32',
  roundOf16: 'round-of-16',
  quarterFinal: 'quarter-final',
  semiFinal: 'semi-final',
  thirdPlace: 'third-place',
  final: 'final',
} as const satisfies Record<MatchRecord['stage'], string>

const BRACKET_ROUND_SLUGS: Record<BracketRoundId, string> = {
  roundOf32: 'round-of-32',
  roundOf16: 'round-of-16',
  quarterFinal: 'quarter-final',
  semiFinal: 'semi-final',
  final: 'final',
  thirdPlace: 'third-place',
}

const normalizeStageSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')

const normalizeRoundSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')

const MATCH_STAGE_SLUG_VALUES = Object.fromEntries(
  Object.entries(MATCH_STAGE_SLUGS).flatMap(([stage, slug]) => [
    [normalizeStageSlug(slug), stage],
    [normalizeStageSlug(stage), stage],
  ]),
) as Record<string, MatchRecord['stage']>

const BRACKET_ROUND_SLUG_VALUES = Object.fromEntries(
  Object.entries(BRACKET_ROUND_SLUGS).flatMap(([roundId, slug]) => [
    [normalizeRoundSlug(slug), roundId],
    [normalizeRoundSlug(roundId), roundId],
  ]),
) as Record<string, BracketRoundId>

const MATCH_STAGE_PATH_SEGMENT =
  '(group|round-of-32|roundOf32|round-of-16|roundOf16|quarter-final|quarterFinal|semi-final|semiFinal|third-place|thirdPlace|final)'
const MATCH_SECTION_PATH_SEGMENT = '(match|bracket|predict)'
const TBD_ROUND_PATH_SEGMENT =
  '(round-of-32|roundOf32|round-of-16|roundOf16|quarter-final|quarterFinal|semi-final|semiFinal|final|third-place|thirdPlace)'

export const normalizeMatchCode = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '')

export const getMatchStageSlug = (stage: MatchRecord['stage']) => MATCH_STAGE_SLUGS[stage]

export const getMatchStageFromSlug = (value: string) => MATCH_STAGE_SLUG_VALUES[normalizeStageSlug(value)] ?? null

export const getBracketRoundSlug = (value: BracketRoundId) => BRACKET_ROUND_SLUGS[value]

export const getBracketRoundFromSlug = (value: string) => BRACKET_ROUND_SLUG_VALUES[normalizeRoundSlug(value)] ?? null

export const buildMatchPathKey = (stage: MatchRecord['stage'], homeCode: string, awayCode: string) =>
  `${getMatchStageSlug(stage)}/${normalizeMatchCode(homeCode)}/vs/${normalizeMatchCode(awayCode)}`

export const buildLegacyMatchPathKey = (homeCode: string, awayCode: string) =>
  `${normalizeMatchCode(homeCode)}/vs/${normalizeMatchCode(awayCode)}`

export const buildTbdMatchPathKey = (roundId: BracketRoundId, slotIndex: number) =>
  `tbd/${getBracketRoundSlug(roundId)}/${slotIndex + 1}`

export const buildMatchPath = (
  section: MatchPathSection,
  stage: MatchRecord['stage'] | null,
  homeCode: string,
  awayCode: string,
) => {
  const pathPrefix = stage ? `${getMatchStageSlug(stage)}/` : ''

  return `/${section}/${pathPrefix}${normalizeMatchCode(homeCode)}/vs/${normalizeMatchCode(awayCode)}`
}

export const parseMatchPathname = (
  pathname: string,
): { section: MatchPathSection; stage: MatchRecord['stage'] | null; pathKey: string; isLegacy: boolean } | null => {
  const stagefulMatch = pathname.match(
    new RegExp(`^/${MATCH_SECTION_PATH_SEGMENT}/${MATCH_STAGE_PATH_SEGMENT}/([^/]+)/vs/([^/]+)/?$`, 'i'),
  )

  if (stagefulMatch) {
    const stage = getMatchStageFromSlug(stagefulMatch[2])

    if (!stage) {
      return null
    }

    return {
      section: stagefulMatch[1].toLowerCase() as MatchPathSection,
      stage,
      pathKey: buildMatchPathKey(stage, decodeURIComponent(stagefulMatch[3]), decodeURIComponent(stagefulMatch[4])),
      isLegacy: false,
    }
  }

  const tbdMatch = pathname.match(new RegExp(`^/${MATCH_SECTION_PATH_SEGMENT}/tbd/${TBD_ROUND_PATH_SEGMENT}/(\\d+)/?$`, 'i'))

  if (tbdMatch) {
    const roundId = getBracketRoundFromSlug(tbdMatch[2])

    if (!roundId) {
      return null
    }

    return {
      section: tbdMatch[1].toLowerCase() as MatchPathSection,
      stage: null,
      pathKey: `tbd/${getBracketRoundSlug(roundId)}/${tbdMatch[3]}`,
      isLegacy: false,
    }
  }

  const legacyMatch = pathname.match(new RegExp(`^/${MATCH_SECTION_PATH_SEGMENT}/([^/]+)/vs/([^/]+)/?$`, 'i'))

  if (!legacyMatch) {
    return null
  }

  return {
    section: legacyMatch[1].toLowerCase() as MatchPathSection,
    stage: null,
    pathKey: buildLegacyMatchPathKey(decodeURIComponent(legacyMatch[2]), decodeURIComponent(legacyMatch[3])),
    isLegacy: true,
  }
}

export const parseMatchSlugSegments = (
  slug: string[],
): { section: MatchPathSection; stage: MatchRecord['stage'] | null; homeCode: string; awayCode: string } | null => {
  if (slug.length >= 5) {
    const section = slug[0]?.toLowerCase()
    const stage = getMatchStageFromSlug(slug[1] ?? '')

    if (section && stage && slug[3]?.toLowerCase() === 'vs') {
      return {
        section: section as MatchPathSection,
        stage,
        homeCode: slug[2] ?? '',
        awayCode: slug[4] ?? '',
      }
    }
  }

  if (slug.length >= 4 && slug[2]?.toLowerCase() === 'vs') {
    return {
      section: slug[0]?.toLowerCase() as MatchPathSection,
      stage: null,
      homeCode: slug[1] ?? '',
      awayCode: slug[3] ?? '',
    }
  }

  return null
}
