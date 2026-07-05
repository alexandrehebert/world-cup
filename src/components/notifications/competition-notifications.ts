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
  allNotifications: NotificationItem[]
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
    .slice(0, 4)
  const liveNotificationMatches = sortedMatches.filter((match) => getDisplayMatchStatus(match, nowMs) === 'live')
  const startingSoonMatches = sortedMatches.filter((match) => isStartingSoon(match, nowMs))
  const finishedNotificationMatches = sortedMatches
    .filter((match) => getDisplayMatchStatus(match, nowMs) === 'finished')
    .sort((first, second) => second.kickoff.localeCompare(first.kickoff))
  const liveWidgetMatches = liveMatches.length > 0
    ? liveMatches.slice(0, 3)
    : [
      ...startingSoonMatches,
      ...scheduledMatches.filter(
        (match) => !startingSoonMatches.some((startingSoonMatch) => startingSoonMatch.id === match.id),
      ),
    ].slice(0, 3)

  const widgetItems: NotificationItem[] = []
  const detailedItems: NotificationItem[] = []

  for (const match of liveNotificationMatches.slice(0, 3)) {
    const home = getTeamName(match, 'home', teamsById, teamLabels, locale, labels.home)
    const away = getTeamName(match, 'away', teamsById, teamLabels, locale, labels.away)

    const notification = {
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
    } satisfies NotificationItem

    widgetItems.push(notification)
    detailedItems.push(notification)
  }

  for (const match of startingSoonMatches.slice(0, 3)) {
    const home = getTeamName(match, 'home', teamsById, teamLabels, locale, labels.home)
    const away = getTeamName(match, 'away', teamsById, teamLabels, locale, labels.away)

    const notification = {
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
    } satisfies NotificationItem

    widgetItems.push(notification)
    detailedItems.push(notification)
  }

  for (const match of finishedNotificationMatches) {
    const home = getTeamName(match, 'home', teamsById, teamLabels, locale, labels.home)
    const away = getTeamName(match, 'away', teamsById, teamLabels, locale, labels.away)
    const score = hasDisplayScore(match, nowMs) ? `${match.home.score ?? 0}-${match.away.score ?? 0}` : labels.finished

    detailedItems.push({
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

  for (const match of latestResults.slice(0, 3)) {
    const home = getTeamName(match, 'home', teamsById, teamLabels, locale, labels.home)
    const away = getTeamName(match, 'away', teamsById, teamLabels, locale, labels.away)
    const score = hasDisplayScore(match, nowMs) ? `${match.home.score ?? 0}-${match.away.score ?? 0}` : labels.finished

    widgetItems.push({
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

  const allNotifications = detailedItems.sort((first, second) => second.timestamp.localeCompare(first.timestamp))
  const notifications = widgetItems.sort((first, second) => second.timestamp.localeCompare(first.timestamp)).slice(0, 6)

  return {
    liveMatches,
    liveWidgetMatches,
    scheduledMatches,
    latestResults,
    notifications,
    allNotifications,
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
