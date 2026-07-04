import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCompetitionNotifications } from '../src/components/notifications/competition-notifications'
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
