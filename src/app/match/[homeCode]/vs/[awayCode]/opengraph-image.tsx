import { ImageResponse } from 'next/og'
import { loadTournamentData } from '../../../../../server/tournament-data'
import { getDisplayMatchStatus, getMatchDisplayTime, formatMatchDate } from '../../../../../lib/format'
import { en } from '../../../../../translations/en'
import type { TournamentData } from '../../../../../types/tournament'

export const dynamic = 'force-dynamic'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'FIFA World Cup 2026 match preview'

type MatchRecord = TournamentData['matches'][number]
type TeamRecord = TournamentData['teams'][number]

const normalizeCode = (value: string | undefined) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '')

type TeamsById = Record<string, TeamRecord>

const findMatchByCodes = (data: TournamentData, teamsById: TeamsById, homeCode: string, awayCode: string) => {
  const normalizedHome = normalizeCode(homeCode)
  const normalizedAway = normalizeCode(awayCode)

  return data.matches.find((match: MatchRecord) => {
    const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
    const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined

    return normalizeCode(homeTeam?.code) === normalizedHome && normalizeCode(awayTeam?.code) === normalizedAway
  })
}

export default async function Image({ params }: { params: Promise<{ homeCode: string; awayCode: string }> }) {
  const { homeCode, awayCode } = await params
  const tournamentData = await loadTournamentData()
  const teamsById = Object.fromEntries(tournamentData.teams.map((team: TeamRecord) => [team.id, team]))
  const match = findMatchByCodes(tournamentData, teamsById, homeCode, awayCode)

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

  const isScheduled = displayStatus === 'scheduled' && match?.kickoff
  const stadiumDates = isScheduled ? formatMatchDate(match!.kickoff, 'en', match!.venue?.timeZone ?? 'UTC') : null
  const utcDates = isScheduled ? formatMatchDate(match!.kickoff, 'en', 'UTC') : null
  const stadiumLocalTime = stadiumDates?.localTime ?? null
  const utcDateTime = utcDates ? `${utcDates.localTime} (UTC)` : null

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 2 }}>FIFA WORLD CUP 2026</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f4c542' }}>{status}</div>
            {liveClock ? <div style={{ fontSize: 22, fontWeight: 700, color: '#7fe5c5' }}>{liveClock}</div> : null}
            {utcDateTime ? <div style={{ fontSize: 20, fontWeight: 500, color: '#c5d5f5', opacity: 0.9 }}>{utcDateTime}</div> : null}
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
            {stadiumLocalTime ? <div style={{ fontSize: 22, fontWeight: 500, color: '#f4c542', opacity: 0.9 }}>{stadiumLocalTime}</div> : null}
          </div>
          <div style={{ fontSize: 26, opacity: 0.76 }}>world-cup.hebert.app</div>
        </div>
      </div>
    ),
    size,
  )
}
