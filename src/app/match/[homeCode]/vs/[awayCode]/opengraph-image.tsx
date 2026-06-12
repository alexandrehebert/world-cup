import { ImageResponse } from 'next/og'
import rawTournamentData from '../../../../../data/worldcup.json'

export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'FIFA World Cup 2026 match preview'

type MatchRecord = (typeof rawTournamentData.matches)[number]
type TeamRecord = (typeof rawTournamentData.teams)[number]

const teamsById = Object.fromEntries(rawTournamentData.teams.map((team: TeamRecord) => [team.id, team]))

const normalizeCode = (value: string | undefined) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '')

const findMatchByCodes = (homeCode: string, awayCode: string) => {
  const normalizedHome = normalizeCode(homeCode)
  const normalizedAway = normalizeCode(awayCode)

  return rawTournamentData.matches.find((match: MatchRecord) => {
    const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
    const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined

    return normalizeCode(homeTeam?.code) === normalizedHome && normalizeCode(awayTeam?.code) === normalizedAway
  })
}

export default async function Image({ params }: { params: Promise<{ homeCode: string; awayCode: string }> }) {
  const { homeCode, awayCode } = await params
  const match = findMatchByCodes(homeCode, awayCode)

  const homeTeam = match?.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match?.away.teamId ? teamsById[match.away.teamId] : undefined
  const homeLabel = homeTeam?.name ?? homeTeam?.code ?? homeCode
  const awayLabel = awayTeam?.name ?? awayTeam?.code ?? awayCode
  const hasScore = typeof match?.home.score === 'number' && typeof match?.away.score === 'number'
  const scoreLine = hasScore ? `${match?.home.score}-${match?.away.score}` : 'VS'
  const status = match ? (match.status === 'live' ? 'LIVE' : match.status === 'finished' ? 'FINISHED' : 'SCHEDULED') : 'MATCH'
  const venue = match ? [match.venue?.stadium, match.venue?.city, match.venue?.country].filter(Boolean).join(' · ') : 'FIFA World Cup 2026'

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
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f4c542' }}>{status}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1 }}>{homeLabel}</div>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1 }}>{awayLabel}</div>
          <div style={{ fontSize: 110, fontWeight: 900, color: '#7fe5c5', marginTop: 10 }}>{scoreLine}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 28, opacity: 0.86 }}>{venue}</div>
          <div style={{ fontSize: 26, opacity: 0.76 }}>world-cup.hebert.app</div>
        </div>
      </div>
    ),
    size,
  )
}
