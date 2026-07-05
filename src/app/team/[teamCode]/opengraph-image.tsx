/* eslint-disable react-refresh/only-export-components */
import { ImageResponse } from 'next/og'
import { getActiveCompetitionProfile } from '../../../competitions'
import { formatMatchDate } from '../../../lib/format'
import { findTeamByCode, getTeamCompetitionDetails } from '../../../lib/team-share'
import { loadTournamentData } from '../../../server/tournament-data'
import type { TeamRecord } from '../../../types/tournament'

export const dynamic = 'force-dynamic'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = `${getActiveCompetitionProfile().displayName} team preview`
const imageResponseOptions = {
  ...size,
  headers: {
    'Cache-Control': 'no-store, max-age=0',
  },
} as const

const getStatusLabel = (status: ReturnType<typeof getTeamCompetitionDetails>['status']) => {
  if (status === 'champion') {
    return 'CHAMPION'
  }

  if (status === 'eliminated') {
    return 'ELIMINATED'
  }

  return 'IN CONTENTION'
}

export default async function Image({ params }: { params: Promise<{ teamCode: string }> }) {
  const competition = getActiveCompetitionProfile()
  const { teamCode } = await params
  const tournamentData = await loadTournamentData()
  const teamsById = Object.fromEntries(tournamentData.teams.map((team: TeamRecord) => [team.id, team]))
  const team = findTeamByCode(tournamentData.teams, teamCode)

  if (!team) {
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
          <div style={{ fontSize: 36, fontWeight: 800 }}>{competition.displayName.toUpperCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 90, fontWeight: 900, lineHeight: 1 }}>TEAM NOT FOUND</div>
            <div style={{ fontSize: 34, color: '#c5d5f5' }}>The shared team path is invalid.</div>
          </div>
          <div style={{ fontSize: 24, opacity: 0.76 }}>{competition.siteDisplayHost ?? competition.id}</div>
        </div>
      ),
      imageResponseOptions,
    )
  }

  const details = getTeamCompetitionDetails({ teamId: team.id, data: tournamentData })
  const nextOpponentId = details.nextMatch
    ? (details.nextMatch.home.teamId === team.id ? details.nextMatch.away.teamId : details.nextMatch.home.teamId)
    : null
  const latestOpponentId = details.latestMatch
    ? (details.latestMatch.home.teamId === team.id ? details.latestMatch.away.teamId : details.latestMatch.home.teamId)
    : null
  const nextOpponentLabel = nextOpponentId ? (teamsById[nextOpponentId]?.name ?? teamsById[nextOpponentId]?.code ?? 'TBD') : null
  const latestOpponentLabel = latestOpponentId
    ? (teamsById[latestOpponentId]?.name ?? teamsById[latestOpponentId]?.code ?? 'TBD')
    : null
  const nextKickoff = details.nextMatch ? formatMatchDate(details.nextMatch.kickoff, 'en', 'UTC').localTime : null
  const latestTeamScore = details.latestMatch
    ? (details.latestMatch.home.teamId === team.id ? details.latestMatch.home.score : details.latestMatch.away.score)
    : null
  const latestOpponentScore = details.latestMatch
    ? (details.latestMatch.home.teamId === team.id ? details.latestMatch.away.score : details.latestMatch.home.score)
    : null
  const statusLabel = getStatusLabel(details.status)
  const statusColor = details.status === 'champion' ? '#f4c542' : details.status === 'eliminated' ? '#ff9f9f' : '#7fe5c5'
  const standingsText = details.group && details.standing && details.standingIndex >= 0
    ? `${details.group.label} · #${details.standingIndex + 1} (${details.standing.points} pts)`
    : 'No group standing available'
  const fixtureText = details.nextMatch && nextOpponentLabel
    ? `Next: ${team.name} vs ${nextOpponentLabel}${nextKickoff ? ` · ${nextKickoff} UTC` : ''}`
    : (details.latestMatch && latestOpponentLabel && typeof latestTeamScore === 'number' && typeof latestOpponentScore === 'number'
      ? `Last: ${team.name} ${latestTeamScore}-${latestOpponentScore} ${latestOpponentLabel}`
      : 'No match context available')

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
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 2 }}>{competition.displayName.toUpperCase()}</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: statusColor }}>{statusLabel}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1 }}>{team.name}</div>
          <div style={{ fontSize: 42, fontWeight: 700, color: '#c5d5f5', letterSpacing: 4 }}>{team.code}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#7fe5c5' }}>{standingsText}</div>
          <div style={{ fontSize: 28, opacity: 0.88 }}>{fixtureText}</div>
          <div style={{ fontSize: 24, opacity: 0.76 }}>{competition.siteDisplayHost ?? competition.id}</div>
        </div>
      </div>
    ),
    imageResponseOptions,
  )
}
