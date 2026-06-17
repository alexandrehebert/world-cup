import type { Metadata } from 'next'
import ClientApp from '../client-app'
import { loadTournamentData } from '../../server/tournament-data'
import { getDisplayMatchStatus, formatMatchDate } from '../../lib/format'
import type { TournamentData } from '../../types/tournament'

export const dynamic = 'force-dynamic'

type MatchRecord = TournamentData['matches'][number]
type TeamRecord = TournamentData['teams'][number]

const normalizeCode = (value: string | undefined) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '')

type TeamsById = Record<string, TeamRecord>

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
  const utcDateStr = displayStatus === 'scheduled' && match.kickoff
    ? formatMatchDate(match.kickoff, 'en', 'UTC').localTime + ' UTC'
    : null
  const description = [
    status,
    hasScore ? `${homeLabel} ${match.home.score}-${match.away.score} ${awayLabel}` : `${homeLabel} vs ${awayLabel}`,
    venue,
    utcDateStr,
  ].filter(Boolean).join(' · ')

  return { title, description }
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug } = await params

  if (!slug || slug.length < 4) {
    return {
      title: 'FIFA World Cup 2026',
      description: 'World Cup dashboard with live results, fixtures, groups, and bracket.',
    }
  }

  const [first, homeCode, third, awayCode] = slug
  const isMatchRoute = first?.toLowerCase() === 'match' && third?.toLowerCase() === 'vs'

  if (!isMatchRoute) {
    return {
      title: 'FIFA World Cup 2026',
      description: 'World Cup dashboard with live results, fixtures, groups, and bracket.',
    }
  }

  const tournamentData = await loadTournamentData()
  const meta = getMatchMeta(tournamentData, homeCode, awayCode)

  if (!meta) {
    return {
      title: 'Match not found | FIFA World Cup 2026',
      description: 'The shared match link does not match a known fixture.',
    }
  }

  const imagePath = `/match/${encodeURIComponent(homeCode)}/vs/${encodeURIComponent(awayCode)}/opengraph-image`
  const canonical = `/match/${encodeURIComponent(homeCode)}/vs/${encodeURIComponent(awayCode)}`

  return {
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

export default async function CatchAllPage() {
  const tournamentData = await loadTournamentData()

  return <ClientApp initialData={tournamentData} />
}
