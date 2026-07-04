import { useMemo } from 'react'
import { useLocale } from '../../contexts/locale-context'
import { useNow } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { getDisplayMatchStatus, getLocalizedText, hasDisplayScore } from '../../lib/format'

type NotificationToken =
  | { type: 'text'; value: string }
  | { type: 'team'; value: string; teamId: string }
  | { type: 'match'; value: string; matchId: string }

export interface NotificationItem {
  id: string
  timestamp: string
  tone: 'live' | 'result'
  tokens: NotificationToken[]
}

const getTeamName = (
  match: ReturnType<typeof useTournament>['matches'][number],
  side: 'home' | 'away',
  teamsById: ReturnType<typeof useTournament>['teamsById'],
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
    teamName: getLocalizedText(team.name, locale) ?? team.code,
  }
}

export const useCompetitionNotifications = () => {
  const { t, locale } = useLocale()
  const { upcomingMatches, teamsById } = useTournament()
  const nowMs = useNow()

  return useMemo(() => {
    const sortedMatches = [...upcomingMatches].sort((first, second) => first.kickoff.localeCompare(second.kickoff))
    const live = sortedMatches.filter((match) => getDisplayMatchStatus(match, nowMs) === 'live').slice(0, 5)
    const scheduled = sortedMatches.filter((match) => getDisplayMatchStatus(match, nowMs) === 'scheduled').slice(0, 12)
    const results = sortedMatches
      .filter((match) => getDisplayMatchStatus(match, nowMs) === 'finished')
      .sort((first, second) => second.kickoff.localeCompare(first.kickoff))
      .slice(0, 5)

    const items: NotificationItem[] = []

    for (const match of live.slice(0, 3)) {
      const home = getTeamName(match, 'home', teamsById, locale, t.labels.home)
      const away = getTeamName(match, 'away', teamsById, locale, t.labels.away)

      items.push({
        id: `live-${match.id}`,
        timestamp: match.kickoff,
        tone: 'live',
        tokens: [
          ...(home.teamId ? [{ type: 'team', value: home.teamName, teamId: home.teamId } as const] : [{ type: 'text', value: home.teamName } as const]),
          { type: 'text', value: ` ${t.labels.vs.toLowerCase()} ` },
          ...(away.teamId ? [{ type: 'team', value: away.teamName, teamId: away.teamId } as const] : [{ type: 'text', value: away.teamName } as const]),
          { type: 'text', value: ` ${t.labels.eventIsLive} ` },
          { type: 'match', value: t.labels.details, matchId: match.id },
          { type: 'text', value: '.' },
        ],
      })
    }

    for (const match of results.slice(0, 3)) {
      const home = getTeamName(match, 'home', teamsById, locale, t.labels.home)
      const away = getTeamName(match, 'away', teamsById, locale, t.labels.away)
      const score = hasDisplayScore(match, nowMs) ? `${match.home.score ?? 0}-${match.away.score ?? 0}` : t.labels.finished

      items.push({
        id: `result-${match.id}`,
        timestamp: match.kickoff,
        tone: 'result',
        tokens: [
          ...(home.teamId ? [{ type: 'team', value: home.teamName, teamId: home.teamId } as const] : [{ type: 'text', value: home.teamName } as const]),
          { type: 'text', value: ` ${t.labels.vs.toLowerCase()} ` },
          ...(away.teamId ? [{ type: 'team', value: away.teamName, teamId: away.teamId } as const] : [{ type: 'text', value: away.teamName } as const]),
          { type: 'text', value: ` ${t.labels.eventEnded} ${score}. ` },
          { type: 'match', value: t.labels.details, matchId: match.id },
          { type: 'text', value: '.' },
        ],
      })
    }

    const notifications = items.sort((first, second) => second.timestamp.localeCompare(first.timestamp)).slice(0, 6)

    return {
      liveMatches: live,
      scheduledMatches: scheduled,
      latestResults: results,
      notifications,
    }
  }, [locale, nowMs, t.labels, teamsById, upcomingMatches])
}
