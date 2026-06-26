/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import ClientApp from '../client-app'
import { loadClientBootstrapData } from '../../server/client-bootstrap'
import { loadTournamentData } from '../../server/tournament-data'
import { getDisplayMatchStatus, formatMatchDate } from '../../lib/format'
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

const findMatchByCodes = (data: TournamentData, teamsById: TeamsById, homeCode: string, awayCode: string) => {
  const normalizedHome = normalizeCode(homeCode)
  const normalizedAway = normalizeCode(awayCode)

  if (!normalizedHome || !normalizedAway) {
    return null
  }

  return data.matches.find((match: MatchRecord) => {
    const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
    const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined

    return normalizeCode(homeTeam?.code) === normalizedHome && normalizeCode(awayTeam?.code) === normalizedAway
  })
}

const getMatchMeta = (data: TournamentData, homeCode: string, awayCode: string) => {
  const teamsById = Object.fromEntries(data.teams.map((team: TeamRecord) => [team.id, team]))
  const match = findMatchByCodes(data, teamsById, homeCode, awayCode)

  if (!match) {
    return null
  }

  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
  const homeLabel = homeTeam?.name ?? homeTeam?.code ?? homeCode
  const awayLabel = awayTeam?.name ?? awayTeam?.code ?? awayCode
  const hasScore = typeof match.home.score === 'number' && typeof match.away.score === 'number'
  const scoreLine = hasScore ? `${match.home.score}-${match.away.score}` : 'vs'
  const title = `${homeLabel} ${scoreLine} ${awayLabel} | FIFA World Cup 2026`
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

  return { title, description }
}

const menuMetaBySegment: Record<string, MenuPageMeta> = {
  overview: {
    title: 'World Cup Schedule | FIFA World Cup 2026',
    description: 'Explore upcoming fixtures, venues, and kickoff times across the full tournament schedule.',
    imagePath: '/menu/overview/opengraph-image',
    imageAlt: 'World Cup schedule overview',
    canonical: '/overview',
  },
  groups: {
    title: 'Group Standings | FIFA World Cup 2026',
    description: 'Track every group table with points, goal difference, and qualification race updates.',
    imagePath: '/menu/groups/opengraph-image',
    imageAlt: 'World Cup group standings',
    canonical: '/groups',
  },
  matches: {
    title: 'Matches | FIFA World Cup 2026',
    description: 'Follow live and upcoming World Cup matches with scores, status, and fixture details.',
    imagePath: '/menu/matches/opengraph-image',
    imageAlt: 'World Cup matches center',
    canonical: '/matches',
  },
  bracket: {
    title: 'Knockout Bracket | FIFA World Cup 2026',
    description: 'See the complete knockout path from Round of 32 to the World Cup final.',
    imagePath: '/menu/bracket/opengraph-image',
    imageAlt: 'World Cup knockout bracket',
    canonical: '/bracket',
  },
  predictions: {
    title: 'World Cup Predictions | FIFA World Cup 2026',
    description: 'Join me on the predictions page and make your picks for upcoming World Cup matches.',
    imagePath: '/predictions/opengraph-image',
    imageAlt: 'World Cup predictions invite',
    canonical: '/predictions',
  },
  leaderboard: {
    title: 'Predictions Leaderboard | FIFA World Cup 2026',
    description: 'Compare player rankings and see who leads the World Cup prediction challenge.',
    imagePath: '/menu/leaderboard/opengraph-image',
    imageAlt: 'World Cup predictions leaderboard',
    canonical: '/leaderboard',
  },
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
  const metadataBase = await resolveMetadataBase()
  const defaultMeta = {
    metadataBase,
    title: 'FIFA World Cup 2026',
    description: 'World Cup dashboard with live results, fixtures, groups, and bracket.',
  }

  const firstSegment = slug?.[0]?.toLowerCase()
  const menuMeta = firstSegment ? menuMetaBySegment[firstSegment] : undefined

  if (menuMeta && slug?.length === 1) {
    return buildMenuMetadata(menuMeta, metadataBase)
  }

  if (firstSegment === 'profile' && slug?.length === 2) {
    const username = slug[1]?.trim()

    if (!username) {
      return defaultMeta
    }

    const decodedUsername = decodeURIComponent(username)
    const title = `${decodedUsername} Predictions Profile | FIFA World Cup 2026`
    const description = `See ${decodedUsername}'s detailed World Cup predictions, ranking, and points on the public profile page.`
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

  if (!slug || slug.length < 4) {
    return defaultMeta
  }

  const [first, homeCode, third, awayCode] = slug
  const isMatchRoute = first?.toLowerCase() === 'match' && third?.toLowerCase() === 'vs'
  const isPredictRoute = first?.toLowerCase() === 'predict' && third?.toLowerCase() === 'vs'

  if (!isMatchRoute && !isPredictRoute) {
    return defaultMeta
  }

  const tournamentData = await loadTournamentData()
  const meta = getMatchMeta(tournamentData, homeCode, awayCode)

  if (!meta) {
    return {
      metadataBase,
      title: 'Match not found | FIFA World Cup 2026',
      description: 'The shared match link does not match a known fixture.',
    }
  }

  if (isPredictRoute) {
    const title = `Do your prediction: ${meta.title}`
    const description = `Quickly make your prediction for this match and compare with current picks.`
    const imagePath = `/predict/${encodeURIComponent(homeCode)}/vs/${encodeURIComponent(awayCode)}/opengraph-image`
    const canonical = `/predict/${encodeURIComponent(homeCode)}/vs/${encodeURIComponent(awayCode)}`

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

  const imagePath = `/match/${encodeURIComponent(homeCode)}/vs/${encodeURIComponent(awayCode)}/opengraph-image`
  const canonical = `/match/${encodeURIComponent(homeCode)}/vs/${encodeURIComponent(awayCode)}`

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

export default async function SlugPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const tournamentData = await loadTournamentData()
  const first = slug?.[0]?.toLowerCase()
  const isPredictRoute = first === 'predict' && slug?.[2]?.toLowerCase() === 'vs'
  const homeCode = slug?.[1]
  const awayCode = slug?.[3]
  const teamsById = Object.fromEntries(tournamentData.teams.map((team: TeamRecord) => [team.id, team]))
  const match = isPredictRoute && homeCode && awayCode
    ? findMatchByCodes(tournamentData, teamsById, homeCode, awayCode)
    : null
  const bootstrapData = await loadClientBootstrapData({
    publicMatchId: match?.id,
  })

  return <ClientApp initialData={tournamentData} bootstrapData={bootstrapData} />
}
