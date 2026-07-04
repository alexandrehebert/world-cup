import { useMemo } from 'react'
import { useLocale } from '../../contexts/locale-context'
import { useNow } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { getDisplayMatchStatus, getLocalizedText, hasDisplayScore } from '../../lib/format'
import type { MatchRecord } from '../../types/tournament'

type NotificationToken =
  | { type: 'text'; value: string }
  | { type: 'team'; value: string; teamId: string }
  | { type: 'match'; value: string; matchId: string }

const STARTING_SOON_WINDOW_MS = 60 * 60 * 1000

export interface NotificationItem {
  id: string
  timestamp: string
  tone: 'live' | 'result' | 'soon'
  tokens: NotificationToken[]
}

export interface CompetitionNotificationsState {
  liveMatches: MatchRecord[]
  liveWidgetMatches: MatchRecord[]
  scheduledMatches: MatchRecord[]
  latestResults: MatchRecord[]
  notifications: NotificationItem[]
}

const getTeamName = (
  match: MatchRecord,
  side: 'home' | 'away',
  teamsById: ReturnType<typeof useTournament>['teamsById'],
  teamLabels: ReturnType<typeof useLocale>['t']['teams'],
  locale: ReturnType<typeof useLocale>['locale'],
  fallback: string,
) => {
  const teamId = match[side].teamId
  if (!teamId) {
    return { teamId: null, teamName: fallback }
  }

  const team = teamsById[teamId]
  if (!team) {
    return { teamId: null, teamName: fallback }
  }

  return {
    teamId,
    teamName: teamLabels[team.id] ?? getLocalizedText(team.name, locale) ?? team.code,
  }
}

const isStartingSoon = (match: MatchRecord, nowMs: number) => {
  if (match.status !== 'scheduled') {
    return false
  }

  const kickoffMs = new Date(match.kickoff).getTime()
  if (!Number.isFinite(kickoffMs)) {
    return false
  }

  return kickoffMs > nowMs && kickoffMs - nowMs <= STARTING_SOON_WINDOW_MS
}

export const buildCompetitionNotifications = ({
  upcomingMatches,
  teamsById,
  teamLabels,
  locale,
  labels,
  nowMs,
}: {
  upcomingMatches: MatchRecord[]
  teamsById: ReturnType<typeof useTournament>['teamsById']
  teamLabels: ReturnType<typeof useLocale>['t']['teams']
  locale: ReturnType<typeof useLocale>['locale']
  labels: ReturnType<typeof useLocale>['t']['labels']
  nowMs: number
}): CompetitionNotificationsState => {
  const sortedMatches = [...upcomingMatches].sort((first, second) => first.kickoff.localeCompare(second.kickoff))
  const liveMatches = sortedMatches.filter((match) => getDisplayMatchStatus(match, nowMs) === 'live').slice(0, 5)
  const scheduledMatches = sortedMatches.filter((match) => getDisplayMatchStatus(match, nowMs) === 'scheduled').slice(0, 12)
  const latestResults = sortedMatches
    .filter((match) => getDisplayMatchStatus(match, nowMs) === 'finished')
    .sort((first, second) => second.kickoff.localeCompare(first.kickoff))
    .slice(0, 5)
  const startingSoonMatches = scheduledMatches.filter((match) => isStartingSoon(match, nowMs)).slice(0, 3)
  const liveWidgetMatches = liveMatches.length > 0 ? liveMatches.slice(0, 3) : (startingSoonMatches.length > 0 ? startingSoonMatches : scheduledMatches.slice(0, 3))

  const items: NotificationItem[] = []

  for (const match of liveMatches.slice(0, 3)) {
    const home = getTeamName(match, 'home', teamsById, teamLabels, locale, labels.home)
    const away = getTeamName(match, 'away', teamsById, teamLabels, locale, labels.away)

    items.push({
      id: `live-${match.id}`,
      timestamp: match.kickoff,
      tone: 'live',
      tokens: [
        ...(home.teamId ? [{ type: 'team', value: home.teamName, teamId: home.teamId } as const] : [{ type: 'text', value: home.teamName } as const]),
        { type: 'text', value: ` ${labels.vs.toLowerCase()} ` },
        ...(away.teamId ? [{ type: 'team', value: away.teamName, teamId: away.teamId } as const] : [{ type: 'text', value: away.teamName } as const]),
        { type: 'text', value: ` ${labels.eventIsLive} ` },
        { type: 'match', value: labels.details, matchId: match.id },
        { type: 'text', value: '.' },
      ],
    })
  }

  for (const match of startingSoonMatches) {
    const home = getTeamName(match, 'home', teamsById, teamLabels, locale, labels.home)
    const away = getTeamName(match, 'away', teamsById, teamLabels, locale, labels.away)

    items.push({
      id: `soon-${match.id}`,
      timestamp: match.kickoff,
      tone: 'soon',
      tokens: [
        ...(home.teamId ? [{ type: 'team', value: home.teamName, teamId: home.teamId } as const] : [{ type: 'text', value: home.teamName } as const]),
        { type: 'text', value: ` ${labels.vs.toLowerCase()} ` },
        ...(away.teamId ? [{ type: 'team', value: away.teamName, teamId: away.teamId } as const] : [{ type: 'text', value: away.teamName } as const]),
        { type: 'text', value: ` ${labels.eventStartsSoon} ` },
        { type: 'match', value: labels.details, matchId: match.id },
        { type: 'text', value: '.' },
      ],
    })
  }

  for (const match of latestResults.slice(0, 3)) {
    const home = getTeamName(match, 'home', teamsById, teamLabels, locale, labels.home)
    const away = getTeamName(match, 'away', teamsById, teamLabels, locale, labels.away)
    const score = hasDisplayScore(match, nowMs) ? `${match.home.score ?? 0}-${match.away.score ?? 0}` : labels.finished

    items.push({
      id: `result-${match.id}`,
      timestamp: match.kickoff,
      tone: 'result',
      tokens: [
        ...(home.teamId ? [{ type: 'team', value: home.teamName, teamId: home.teamId } as const] : [{ type: 'text', value: home.teamName } as const]),
        { type: 'text', value: ` ${labels.vs.toLowerCase()} ` },
        ...(away.teamId ? [{ type: 'team', value: away.teamName, teamId: away.teamId } as const] : [{ type: 'text', value: away.teamName } as const]),
        { type: 'text', value: ` ${labels.eventEnded} ${score}. ` },
        { type: 'match', value: labels.details, matchId: match.id },
        { type: 'text', value: '.' },
      ],
    })
  }

  const notifications = items.sort((first, second) => second.timestamp.localeCompare(first.timestamp)).slice(0, 6)

  return {
    liveMatches,
    liveWidgetMatches,
    scheduledMatches,
    latestResults,
    notifications,
  }
}

export const useCompetitionNotifications = () => {
  const { t, locale } = useLocale()
  const { upcomingMatches, teamsById } = useTournament()
  const nowMs = useNow()

  return useMemo(
    () =>
      buildCompetitionNotifications({
        upcomingMatches,
        teamsById,
        teamLabels: t.teams,
        locale,
        labels: t.labels,
        nowMs,
      }),
    [locale, nowMs, t.labels, t.teams, teamsById, upcomingMatches],
  )
}
