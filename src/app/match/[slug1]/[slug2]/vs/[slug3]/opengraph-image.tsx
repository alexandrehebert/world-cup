/* eslint-disable react-refresh/only-export-components */
import { ImageResponse } from 'next/og'
import { loadTournamentData } from '../../../../../../server/tournament-data'
import { getDisplayMatchStatus, getMatchDisplayTime, formatMatchDate } from '../../../../../../lib/format'
import { getMatchStageFromSlug } from '../../../../../../lib/match-path'
import { en } from '../../../../../../translations/en'
import type { TournamentData } from '../../../../../../types/tournament'

export const dynamic = 'force-dynamic'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'FIFA World Cup 2026 match preview'
const imageResponseOptions = {
  ...size,
  headers: {
    'Cache-Control': 'no-store, max-age=0',
  },
} as const

type MatchRecord = TournamentData['matches'][number]
type TeamRecord = TournamentData['teams'][number]

const normalizeCode = (value: string | undefined) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '')

type TeamsById = Record<string, TeamRecord>

const findMatchByCodes = (
  data: TournamentData,
  teamsById: TeamsById,
  homeCode: string,
  awayCode: string,
  stage: MatchRecord['stage'] | null,
) => {
  const normalizedHome = normalizeCode(homeCode)
  const normalizedAway = normalizeCode(awayCode)

  return data.matches.find((match: MatchRecord) => {
    if (stage && match.stage !== stage) {
      return false
    }

    const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
    const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined

    return normalizeCode(homeTeam?.code) === normalizedHome && normalizeCode(awayTeam?.code) === normalizedAway
  })
}

export default async function Image({ params }: { params: Promise<{ slug1: string; slug2: string; slug3: string }> }) {
  const { slug1, slug2, slug3 } = await params
  const stage = slug1
  const homeCode = slug2
  const awayCode = slug3
  const tournamentData = await loadTournamentData()
  const teamsById = Object.fromEntries(tournamentData.teams.map((team: TeamRecord) => [team.id, team]))
  const match = findMatchByCodes(tournamentData, teamsById, homeCode, awayCode, getMatchStageFromSlug(stage))

  const homeTeam = match?.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match?.away.teamId ? teamsById[match.away.teamId] : undefined
  const homeLabel = homeTeam?.name ?? homeTeam?.code ?? homeCode
  const awayLabel = awayTeam?.name ?? awayTeam?.code ?? awayCode
  const displayStatus = match ? getDisplayMatchStatus(match) : null
  const liveClock = match && displayStatus === 'live' ? getMatchDisplayTime(match, en.labels) : null
  const hasScore = typeof match?.home.score === 'number' && typeof match?.away.score === 'number'
  const scoreLine = hasScore ? `${match?.home.score}-${match?.away.score}` : 'VS'
  const status = displayStatus === 'live' ? 'LIVE' : displayStatus === 'finished' ? 'FINISHED' : displayStatus === 'scheduled' ? 'SCHEDULED' : 'MATCH'
  const venue = match ? [match.venue?.stadium, match.venue?.city, match.venue?.country].filter(Boolean).join(' · ') : 'FIFA World Cup 2026'

  const scheduledKickoff = displayStatus === 'scheduled' ? match?.kickoff : undefined
  const stadiumDates = scheduledKickoff ? formatMatchDate(scheduledKickoff, 'en', match?.venue?.timeZone ?? 'UTC') : null
  const utcDates = scheduledKickoff ? formatMatchDate(scheduledKickoff, 'en', 'UTC') : null
  const stadiumLocalTime = stadiumDates?.localTime ?? null
  const utcDateTime = utcDates?.localTime ?? null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #07111f 0%, #111c33 100%)',
          color: '#f4f7fb',
          fontFamily: 'Inter, Arial, sans-serif',
          padding: '56px 64px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 2 }}>FIFA WORLD CUP 2026</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#f4c542' }}>{status}</div>
            {liveClock ? <div style={{ fontSize: 28, fontWeight: 800, color: '#7fe5c5' }}>{liveClock}</div> : null}
            {stadiumLocalTime ? <div style={{ fontSize: 32, fontWeight: 700, color: '#c5d5f5', opacity: 0.95 }}>{stadiumLocalTime}</div> : null}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1 }}>{homeLabel}</div>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1 }}>{awayLabel}</div>
          <div style={{ fontSize: 110, fontWeight: 900, color: '#7fe5c5', marginTop: 10 }}>{scoreLine}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 28, opacity: 0.86 }}>{venue}</div>
            {utcDateTime ? <div style={{ fontSize: 22, fontWeight: 500, color: '#f4c542', opacity: 0.9 }}>{utcDateTime}</div> : null}
          </div>
          <div style={{ fontSize: 26, opacity: 0.76 }}>world-cup.hebert.app</div>
        </div>
      </div>
    ),
    imageResponseOptions,
  )
}
