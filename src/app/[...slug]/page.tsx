/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getActiveCompetitionProfile } from '../../competitions'
import ClientApp from '../client-app'
import { loadClientBootstrapData } from '../../server/client-bootstrap'
import { loadTournamentData } from '../../server/tournament-data'
import { getDisplayMatchStatus, formatMatchDate } from '../../lib/format'
import { isPredictionsFeatureEnabled } from '../../lib/features'
import { getStandingsSectionSlug } from '../../lib/competition-sections'
import { getMatchStageSlug, parseMatchSlugSegments } from '../../lib/match-path'
import type { TournamentData } from '../../types/tournament'

export const dynamic = 'force-dynamic'

type MatchRecord = TournamentData['matches'][number]
type TeamRecord = TournamentData['teams'][number]

const normalizeCode = (value: string | undefined) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '')

type TeamsById = Record<string, TeamRecord>
type MenuPageMeta = { title: string; description: string; imagePath: string; imageAlt: string; canonical: string }
const DEFAULT_METADATA_BASE = 'http://localhost:3000'

const extractForwardedHeaderValue = (value: string | null) => value?.split(',')[0]?.trim() ?? null

const resolveMetadataBase = async () => {
  const requestHeaders = await headers()
  const forwardedHost = extractForwardedHeaderValue(requestHeaders.get('x-forwarded-host'))
  const host = forwardedHost ?? extractForwardedHeaderValue(requestHeaders.get('host')) ?? 'localhost:3000'
  const forwardedProto = extractForwardedHeaderValue(requestHeaders.get('x-forwarded-proto'))
  const protocol = forwardedProto ?? (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
  const candidate = `${protocol}://${host}`

  return new URL(URL.canParse(candidate) ? candidate : DEFAULT_METADATA_BASE)
}

const findMatchByCodes = (
  data: TournamentData,
  teamsById: TeamsById,
  homeCode: string,
  awayCode: string,
  stage?: TournamentData['matches'][number]['stage'] | null,
) => {
  const normalizedHome = normalizeCode(homeCode)
  const normalizedAway = normalizeCode(awayCode)

  if (!normalizedHome || !normalizedAway) {
    return null
  }

  return data.matches.find((match: MatchRecord) => {
    if (stage && match.stage !== stage) {
      return false
    }

    const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
    const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined

    return normalizeCode(homeTeam?.code) === normalizedHome && normalizeCode(awayTeam?.code) === normalizedAway
  })
}

const getMatchMeta = (
  data: TournamentData,
  homeCode: string,
  awayCode: string,
  competitionDisplayName: string,
  stage?: TournamentData['matches'][number]['stage'] | null,
) => {
  const teamsById = Object.fromEntries(data.teams.map((team: TeamRecord) => [team.id, team]))
  const match = findMatchByCodes(data, teamsById, homeCode, awayCode, stage)

  if (!match) {
    return null
  }

  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
  const homeLabel = homeTeam?.name ?? homeTeam?.code ?? homeCode
  const awayLabel = awayTeam?.name ?? awayTeam?.code ?? awayCode
  const hasScore = typeof match.home.score === 'number' && typeof match.away.score === 'number'
  const scoreLine = hasScore ? `${match.home.score}-${match.away.score}` : 'vs'
  const title = `${homeLabel} ${scoreLine} ${awayLabel} | ${competitionDisplayName}`
  const venue = [match.venue?.stadium, match.venue?.city, match.venue?.country].filter(Boolean).join(' · ')
  const displayStatus = getDisplayMatchStatus(match)
  const status = displayStatus === 'live' ? 'Live' : displayStatus === 'finished' ? 'Finished' : 'Scheduled'
  const utcDateStr = displayStatus === 'scheduled' && match.kickoff ? formatMatchDate(match.kickoff, 'en', 'UTC').localTime : null
  const description = [
    status,
    hasScore ? `${homeLabel} ${match.home.score}-${match.away.score} ${awayLabel}` : `${homeLabel} vs ${awayLabel}`,
    venue,
    utcDateStr,
  ].filter(Boolean).join(' · ')

  return { title, description, match }
}

const getMenuMetaBySegment = (
  competitionDisplayName: string,
  competitionShortName: string,
  sportLabel: string,
  standingsSectionSlug: string,
): Record<string, MenuPageMeta> => {
  const standingsLabel = standingsSectionSlug === 'standings' ? 'Standings' : 'Group Standings'
  const standingsDescription = standingsSectionSlug === 'standings'
    ? 'Track the latest table with points, score difference, and title race updates.'
    : 'Track every group table with points, goal difference, and qualification race updates.'
  const agendaMeta: MenuPageMeta = {
    title: `Agenda | ${competitionDisplayName}`,
    description: 'Explore upcoming fixtures, venues, and kickoff times across the tournament agenda.',
    imagePath: '/menu/agenda/opengraph-image',
    imageAlt: 'Tournament agenda overview',
    canonical: '/agenda',
  }

  return ({
  overview: agendaMeta,
  agenda: agendaMeta,
  [standingsSectionSlug]: {
    title: `${standingsLabel} | ${competitionDisplayName}`,
    description: standingsDescription,
    imagePath: `/menu/${standingsSectionSlug}/opengraph-image`,
    imageAlt: `Tournament ${standingsLabel.toLowerCase()}`,
    canonical: `/${standingsSectionSlug}`,
  },
  teams: {
    title: `Teams | ${competitionDisplayName}`,
    description: 'Explore all qualified teams and open each team details modal.',
    imagePath: '/menu/teams/opengraph-image',
    imageAlt: 'Tournament teams directory',
    canonical: '/teams',
  },
  stadiums: {
    title: `Stadiums | ${competitionDisplayName}`,
    description: 'Browse tournament stadiums with locations, seat capacities, and hosting details.',
    imagePath: '/menu/stadiums/opengraph-image',
    imageAlt: 'Tournament stadium directory',
    canonical: '/stadiums',
  },
  matches: {
    title: `Matches | ${competitionDisplayName}`,
    description: `Follow live and upcoming ${sportLabel} matches with scores, status, and fixture details.`,
    imagePath: '/menu/matches/opengraph-image',
    imageAlt: 'Tournament matches center',
    canonical: '/matches',
  },
  bracket: {
    title: `Knockout Bracket | ${competitionDisplayName}`,
    description: `See the complete knockout path from opening elimination rounds to the ${competitionShortName} final.`,
    imagePath: '/menu/bracket/opengraph-image',
    imageAlt: 'Tournament knockout bracket',
    canonical: '/bracket',
  },
  ...(isPredictionsFeatureEnabled
    ? {
        predictions: {
          title: `${competitionShortName} Predictions | ${competitionDisplayName}`,
          description: `Join me on the predictions page and make your picks for upcoming ${sportLabel} matches.`,
          imagePath: '/predictions/opengraph-image',
          imageAlt: 'Tournament predictions invite',
          canonical: '/predictions',
        },
        leaderboard: {
          title: `Predictions Leaderboard | ${competitionDisplayName}`,
          description: `Compare player rankings and see who leads the ${competitionShortName} prediction challenge.`,
          imagePath: '/menu/leaderboard/opengraph-image',
          imageAlt: 'Tournament predictions leaderboard',
          canonical: '/leaderboard',
        },
      }
    : {}),
})
}

const buildMenuMetadata = (meta: MenuPageMeta, metadataBase: URL): Metadata => ({
  metadataBase,
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.canonical },
  openGraph: {
    title: meta.title,
    description: meta.description,
    type: 'website',
    url: meta.canonical,
    images: [{ url: meta.imagePath, width: 1200, height: 630, alt: meta.imageAlt }],
  },
  twitter: {
    card: 'summary_large_image',
    title: meta.title,
    description: meta.description,
    images: [meta.imagePath],
  },
})

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params
  const matchPath = slug ? parseMatchSlugSegments(slug) : null
  const metadataBase = await resolveMetadataBase()
  const competition = getActiveCompetitionProfile()
  const competitionDisplayName = competition.displayName
  const competitionShortName = competition.shortName
  const standingsSectionSlug = getStandingsSectionSlug(competition.id)
  const menuMetaBySegment = getMenuMetaBySegment(competitionDisplayName, competitionShortName, competition.sportLabel, standingsSectionSlug)
  const defaultMeta = {
    metadataBase,
    title: competitionDisplayName,
    description: `${competitionShortName} dashboard with live results, fixtures, ${
      standingsSectionSlug === 'standings' ? 'standings' : 'groups'
    }, and bracket.`,
  }

  const firstSegment = slug?.[0]?.toLowerCase()
  const menuMeta = firstSegment ? menuMetaBySegment[firstSegment] : undefined

  if (menuMeta && slug?.length === 1) {
    return buildMenuMetadata(menuMeta, metadataBase)
  }

  if (isPredictionsFeatureEnabled && firstSegment === 'profile' && slug?.length === 2) {
    const username = slug[1]?.trim()

    if (!username) {
      return defaultMeta
    }

    const decodedUsername = decodeURIComponent(username)
    const title = `${decodedUsername} Predictions Profile | ${competitionDisplayName}`
    const description = `See ${decodedUsername}'s detailed ${competitionShortName} predictions, ranking, and points on the public profile page.`
    const canonical = `/profile/${encodeURIComponent(decodedUsername)}`

    return {
      metadataBase,
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        type: 'website',
        url: canonical,
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    }
  }

  if (!matchPath || !firstSegment || (firstSegment !== 'match' && firstSegment !== 'predict')) {
    return defaultMeta
  }

  const isMatchRoute = matchPath.section === 'match'
  const isPredictRoute = isPredictionsFeatureEnabled && matchPath.section === 'predict'

  if (!isMatchRoute && !isPredictRoute) {
    return defaultMeta
  }

  const tournamentData = await loadTournamentData()
  const meta = getMatchMeta(tournamentData, matchPath.homeCode, matchPath.awayCode, competitionDisplayName, matchPath.stage)

  if (!meta) {
    return {
      metadataBase,
      title: `Match not found | ${competitionDisplayName}`,
      description: 'The shared match link does not match a known fixture.',
    }
  }

  if (isPredictRoute) {
    const title = `Do your prediction: ${meta.title}`
    const description = `Quickly make your prediction for this match and compare with current picks.`
    const imagePath = `/predict/${getMatchStageSlug(meta.match.stage)}/${encodeURIComponent(matchPath.homeCode)}/vs/${encodeURIComponent(matchPath.awayCode)}/opengraph-image`
    const canonical = `/predict/${getMatchStageSlug(meta.match.stage)}/${encodeURIComponent(matchPath.homeCode)}/vs/${encodeURIComponent(matchPath.awayCode)}`

    return {
      metadataBase,
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        type: 'website',
        url: canonical,
        images: [{ url: imagePath, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imagePath],
      },
    }
  }

  const imagePath = `/match/${getMatchStageSlug(meta.match.stage)}/${encodeURIComponent(matchPath.homeCode)}/vs/${encodeURIComponent(matchPath.awayCode)}/opengraph-image`
  const canonical = `/match/${getMatchStageSlug(meta.match.stage)}/${encodeURIComponent(matchPath.homeCode)}/vs/${encodeURIComponent(matchPath.awayCode)}`

  return {
    metadataBase,
    title: meta.title,
    description: meta.description,
    alternates: { canonical },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: 'website',
      url: canonical,
      images: [{ url: imagePath, width: 1200, height: 630, alt: meta.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [imagePath],
    },
  }
}

export default async function SlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const queryEntries: [string, string][] = []

  if (resolvedSearchParams) {
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === 'string') {
        queryEntries.push([key, value])
        continue
      }

      if (Array.isArray(value)) {
        for (const entry of value) {
          queryEntries.push([key, entry])
        }
      }
    }
  }

  const query = resolvedSearchParams ? new URLSearchParams(queryEntries).toString() : ''
  const initialPath = `/${slug.map((segment) => encodeURIComponent(segment)).join('/')}${query ? `?${query}` : ''}`
  const tournamentData = await loadTournamentData()
  const first = slug?.[0]?.toLowerCase()
  const matchPath = slug ? parseMatchSlugSegments(slug) : null
  const isPredictRoute = isPredictionsFeatureEnabled && first === 'predict' && matchPath?.section === 'predict'
  const teamsById = Object.fromEntries(tournamentData.teams.map((team: TeamRecord) => [team.id, team]))
  const match = isPredictRoute && matchPath
    ? findMatchByCodes(tournamentData, teamsById, matchPath.homeCode, matchPath.awayCode, matchPath.stage)
    : null
  const bootstrapData = await loadClientBootstrapData({
    publicMatchId: isPredictionsFeatureEnabled ? match?.id : undefined,
  })

  return <ClientApp initialData={tournamentData} bootstrapData={bootstrapData} initialPath={initialPath} />
}
