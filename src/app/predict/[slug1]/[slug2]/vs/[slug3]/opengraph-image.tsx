/* eslint-disable react-refresh/only-export-components */
import { ImageResponse } from 'next/og'
import { loadTournamentData } from '../../../../../../server/tournament-data'
import { getMatchStageFromSlug } from '../../../../../../lib/match-path'
import type { TournamentData } from '../../../../../../types/tournament'

export const dynamic = 'force-dynamic'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'Do your World Cup prediction'

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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#f8fafc',
          fontFamily: 'Inter, Arial, sans-serif',
          padding: '56px 64px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 1.5 }}>FIFA WORLD CUP 2026</div>
          <div style={{ fontSize: 24, color: '#7dd3fc', fontWeight: 700 }}>Quick prediction invite</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 78, fontWeight: 900, lineHeight: 1 }}>{homeLabel}</div>
          <div style={{ fontSize: 66, fontWeight: 800, color: '#facc15' }}>VS</div>
          <div style={{ fontSize: 78, fontWeight: 900, lineHeight: 1 }}>{awayLabel}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#86efac' }}>Do your prediction now</div>
            <div style={{ fontSize: 24, opacity: 0.86 }}>{venue}</div>
          </div>
          <div style={{ fontSize: 26, opacity: 0.76 }}>world-cup.hebert.app</div>
        </div>
      </div>
    ),
    size,
  )
}
