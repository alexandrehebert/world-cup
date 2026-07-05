import { getDisplayMatchStatus, getMatchWinner } from './format'
import { isTeamEliminated } from './team-status'
import type { GroupRecord, MatchRecord, StandingRecord, TeamRecord, TournamentData } from '../types/tournament'

export type TeamCompetitionStatus = 'champion' | 'eliminated' | 'active'

export type TeamCompetitionDetails = {
  status: TeamCompetitionStatus
  nextMatch: MatchRecord | null
  latestMatch: MatchRecord | null
  group: GroupRecord | null
  standing: StandingRecord | null
  standingIndex: number
}

export const normalizeTeamCode = (value: string | undefined) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')

export const findTeamByCode = (teams: TeamRecord[], teamCode: string): TeamRecord | null => {
  const normalizedCode = normalizeTeamCode(teamCode)

  if (!normalizedCode) {
    return null
  }

  return teams.find((team) => normalizeTeamCode(team.code) === normalizedCode) ?? null
}

export const getTeamCompetitionDetails = ({
  teamId,
  data,
  nowMs = Date.now(),
}: {
  teamId: string
  data: TournamentData
  nowMs?: number
}): TeamCompetitionDetails => {
  const teamMatches = data.matches
    .filter((match) => match.home.teamId === teamId || match.away.teamId === teamId)
    .sort((first, second) => first.kickoff.localeCompare(second.kickoff))
  const nextMatch = teamMatches.find((match) => getDisplayMatchStatus(match, nowMs) !== 'finished') ?? null
  const latestMatch = teamMatches.length > 0 ? teamMatches[teamMatches.length - 1] : null
  const latestStatus = latestMatch ? getDisplayMatchStatus(latestMatch, nowMs) : null
  const latestWinner = latestMatch ? getMatchWinner(latestMatch, nowMs) : null
  const isLatestHome = latestMatch?.home.teamId === teamId
  const isLatestWinner = latestWinner ? (isLatestHome ? latestWinner === 'home' : latestWinner === 'away') : false
  const isChampion = Boolean(latestMatch && latestMatch.stage === 'final' && latestStatus === 'finished' && isLatestWinner)
  const isEliminated = isTeamEliminated({
    teamId,
    matches: data.matches,
    nowMs,
    competitionId: data.meta.competitionId,
    groups: data.groups,
  })
  const group = data.groups.find((entry) => entry.teamIds.includes(teamId)) ?? null
  const standingIndex = group ? group.standings.findIndex((standing) => standing.teamId === teamId) : -1
  const standing = group && standingIndex >= 0 ? group.standings[standingIndex] : null

  return {
    status: isChampion ? 'champion' : (isEliminated ? 'eliminated' : 'active'),
    nextMatch,
    latestMatch,
    group,
    standing,
    standingIndex,
  }
}
