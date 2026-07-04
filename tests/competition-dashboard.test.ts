import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScheduleCalendarDays } from '../src/lib/dashboard-schedule'
import type { MatchRecord } from '../src/types/tournament'

const createMatch = (id: string, kickoff: string): MatchRecord => ({
  id,
  stage: 'group',
  home: {
    teamId: 'usa',
  },
  away: {
    teamId: 'mex',
  },
  kickoff,
  venue: {
    stadium: 'Test Stadium',
    city: 'Test City',
    country: 'Test Country',
    timeZone: 'UTC',
  },
  status: 'scheduled',
})

test('buildScheduleCalendarDays limits the dashboard schedule widget to four days', () => {
  const scheduledMatches = [
    createMatch('m1', '2026-07-01T12:00:00Z'),
    createMatch('m2', '2026-07-02T12:00:00Z'),
    createMatch('m3', '2026-07-03T12:00:00Z'),
    createMatch('m4', '2026-07-04T12:00:00Z'),
    createMatch('m5', '2026-07-05T12:00:00Z'),
  ]

  const scheduleCalendarDays = buildScheduleCalendarDays(scheduledMatches, 'en-GB', 'UTC')

  assert.equal(scheduleCalendarDays.length, 4)
  assert.deepEqual(
    scheduleCalendarDays.map((day) => day.label),
    ['1 Jul', '2 Jul', '3 Jul', '4 Jul'],
  )
})
