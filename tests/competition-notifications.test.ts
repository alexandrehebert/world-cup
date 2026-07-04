import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCompetitionNotifications } from '../src/components/notifications/competition-notifications'
import { buildEventTimelineDayGroups } from '../src/components/notifications/events-timeline'
import { en } from '../src/translations/en'
import type { MatchRecord, TeamRecord } from '../src/types/tournament'

const teamsById: Record<string, TeamRecord> = {
  usa: { id: 'usa', code: 'USA', name: 'United States', flagCode: 'us' },
  mex: { id: 'mex', code: 'MEX', name: 'Mexico', flagCode: 'mx' },
  bra: { id: 'bra', code: 'BRA', name: 'Brazil', flagCode: 'br' },
  arg: { id: 'arg', code: 'ARG', name: 'Argentina', flagCode: 'ar' },
}

const createMatch = (overrides: Partial<MatchRecord> & Pick<MatchRecord, 'id' | 'kickoff' | 'status'>): MatchRecord => ({
  id: overrides.id,
  stage: 'group',
  home: {
    teamId: 'usa',
  },
  away: {
    teamId: 'mex',
  },
  kickoff: overrides.kickoff,
  venue: {
    stadium: 'Test Stadium',
    city: 'Test City',
    country: 'Test Country',
    timeZone: 'UTC',
  },
  status: overrides.status,
  ...overrides,
})

test('shows upcoming matches in the live widget when no matches are live', () => {
  const nowMs = Date.parse('2026-07-04T12:00:00.000Z')
  const soonMatch = createMatch({
    id: 'soon-match',
    kickoff: '2026-07-04T12:30:00.000Z',
    status: 'scheduled',
    home: { teamId: 'bra' },
    away: { teamId: 'arg' },
  })
  const laterMatch = createMatch({
    id: 'later-match',
    kickoff: '2026-07-04T16:30:00.000Z',
    status: 'scheduled',
  })

  const result = buildCompetitionNotifications({
    upcomingMatches: [laterMatch, soonMatch],
    teamsById,
    teamLabels: en.teams,
    locale: 'en',
    labels: en.labels,
    nowMs,
  })

  assert.equal(result.liveMatches.length, 0)
  assert.equal(result.liveWidgetMatches.length, 1)
  assert.equal(result.liveWidgetMatches[0]?.id, 'soon-match')
})

test('adds a starting-soon notification for matches that are about to begin', () => {
  const nowMs = Date.parse('2026-07-04T12:00:00.000Z')
  const soonMatch = createMatch({
    id: 'soon-match',
    kickoff: '2026-07-04T12:30:00.000Z',
    status: 'scheduled',
    home: { teamId: 'bra' },
    away: { teamId: 'arg' },
  })

  const result = buildCompetitionNotifications({
    upcomingMatches: [soonMatch],
    teamsById,
    teamLabels: en.teams,
    locale: 'en',
    labels: en.labels,
    nowMs,
  })

  const soonNotification = result.notifications.find((notification) => notification.tone === 'soon')

  assert.ok(soonNotification)
  assert.equal(soonNotification?.id, 'soon-soon-match')
  assert.equal(soonNotification?.tokens.some((token) => token.type === 'match' && token.matchId === 'soon-match'), true)
})

test('keeps a short widget list while exposing the full events timeline', () => {
  const nowMs = Date.parse('2026-07-04T12:00:00.000Z')
  const matches = [
    createMatch({ id: 'live-1', kickoff: '2026-07-04T12:10:00.000Z', status: 'live' }),
    createMatch({ id: 'live-2', kickoff: '2026-07-04T12:20:00.000Z', status: 'live' }),
    createMatch({ id: 'live-3', kickoff: '2026-07-04T12:30:00.000Z', status: 'live' }),
    createMatch({ id: 'soon-1', kickoff: '2026-07-04T12:40:00.000Z', status: 'scheduled' }),
    createMatch({ id: 'soon-2', kickoff: '2026-07-04T12:50:00.000Z', status: 'scheduled' }),
    createMatch({ id: 'soon-3', kickoff: '2026-07-04T12:55:00.000Z', status: 'scheduled' }),
    ...Array.from({ length: 8 }, (_, index) =>
      createMatch({
        id: `finished-${index + 1}`,
        kickoff: `2026-07-0${index + 1}T10:00:00.000Z`,
        status: 'finished',
      }),
    ),
  ]

  const result = buildCompetitionNotifications({
    upcomingMatches: matches,
    teamsById,
    teamLabels: en.teams,
    locale: 'en',
    labels: en.labels,
    nowMs,
  })

  assert.equal(result.notifications.length, 6)
  assert.equal(result.allNotifications.length, 14)
  assert.equal(result.allNotifications[0]?.id, 'result-finished-8')
})

test('groups the events timeline by day in chronological order', () => {
  const dayGroups = buildEventTimelineDayGroups(
    [
      { id: 'b', timestamp: '2026-07-03T09:00:00.000Z', tone: 'result', tokens: [{ type: 'text', value: 'B' }] },
      { id: 'a', timestamp: '2026-07-02T18:00:00.000Z', tone: 'live', tokens: [{ type: 'text', value: 'A' }] },
      { id: 'c', timestamp: '2026-07-03T12:00:00.000Z', tone: 'soon', tokens: [{ type: 'text', value: 'C' }] },
    ],
    'en',
    'UTC',
    'Today',
    Date.parse('2026-07-03T13:00:00.000Z'),
  )

  assert.equal(dayGroups.length, 2)
  assert.equal(dayGroups[0]?.dayLabel, 'Today')
  assert.deepEqual(dayGroups[0]?.notifications.map((notification) => notification.id), ['c', 'b'])
  assert.equal(dayGroups[1]?.dayKey, '2026-07-02')
  assert.equal(dayGroups[1]?.notifications[0]?.id, 'a')
})

test('limits latest results to four dashboard matches', () => {
  const nowMs = Date.parse('2026-07-04T12:00:00.000Z')
  const finishedMatches = [
    createMatch({ id: 'finished-1', kickoff: '2026-07-04T11:55:00.000Z', status: 'finished' }),
    createMatch({ id: 'finished-2', kickoff: '2026-07-04T11:50:00.000Z', status: 'finished' }),
    createMatch({ id: 'finished-3', kickoff: '2026-07-04T11:45:00.000Z', status: 'finished' }),
    createMatch({ id: 'finished-4', kickoff: '2026-07-04T11:40:00.000Z', status: 'finished' }),
    createMatch({ id: 'finished-5', kickoff: '2026-07-04T11:35:00.000Z', status: 'finished' }),
  ]

  const result = buildCompetitionNotifications({
    upcomingMatches: finishedMatches,
    teamsById,
    teamLabels: en.teams,
    locale: 'en',
    labels: en.labels,
    nowMs,
  })

  assert.equal(result.latestResults.length, 4)
  assert.deepEqual(
    result.latestResults.map((match) => match.id),
    ['finished-1', 'finished-2', 'finished-3', 'finished-4'],
  )
})
