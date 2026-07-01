import assert from 'node:assert/strict'
import test from 'node:test'

import { getEspnDateWindow } from '../src/server/sync-matches'
import type { MatchRecord, TournamentData } from '../src/types/tournament'

const createMatch = (overrides: Partial<MatchRecord>): MatchRecord => ({
  id: 'm1',
  stage: 'roundOf32',
  roundId: 'roundOf32',
  home: { teamId: 'ger', score: 1 },
  away: { teamId: 'par', score: 1 },
  kickoff: '2026-06-30T01:00:00Z',
  venue: {
    stadium: 'Test Stadium',
    city: 'Test City',
    country: 'Test Country',
    timeZone: 'UTC',
  },
  status: 'finished',
  live: {
    detail: 'FT-Pens',
    shortDetail: 'FT-Pens',
  },
  ...overrides,
})

const createData = (match: MatchRecord): TournamentData => ({
  meta: {
    edition: 'FIFA World Cup 2026',
    season: '2026',
    host: 'Test',
    updatedAt: '2026-07-01T00:00:00.000Z',
    venueCountry: 'Test',
  },
  teams: [],
  groups: [],
  matches: [match],
  bracketRounds: [],
})

test('getEspnDateWindow includes recently finished FT-Pens knockout matches missing penalty scores', () => {
  const previousLookback = process.env.ESPN_LOOKBACK_DAYS
  process.env.ESPN_LOOKBACK_DAYS = '7'

  const dateWindow = getEspnDateWindow(
    createData(
      createMatch({
        home: { teamId: 'ger', score: 1 },
        away: { teamId: 'par', score: 1 },
      }),
    ),
    new Date('2026-07-02T12:00:00.000Z'),
  )

  if (previousLookback === undefined) {
    delete process.env.ESPN_LOOKBACK_DAYS
  } else {
    process.env.ESPN_LOOKBACK_DAYS = previousLookback
  }

  assert.ok(dateWindow.includes('20260630'))
  assert.ok(dateWindow.includes('20260629'))
})

test('getEspnDateWindow skips finished FT-Pens matches once penalty scores are already stored', () => {
  const previousLookback = process.env.ESPN_LOOKBACK_DAYS
  process.env.ESPN_LOOKBACK_DAYS = '7'

  const dateWindow = getEspnDateWindow(
    createData(
      createMatch({
        home: { teamId: 'ger', score: 1, penaltyScore: 3 },
        away: { teamId: 'par', score: 1, penaltyScore: 4 },
      }),
    ),
    new Date('2026-07-02T12:00:00.000Z'),
  )

  if (previousLookback === undefined) {
    delete process.env.ESPN_LOOKBACK_DAYS
  } else {
    process.env.ESPN_LOOKBACK_DAYS = previousLookback
  }

  assert.ok(!dateWindow.includes('20260630'))
})

test('getEspnDateWindow includes old unresolved past matches even outside lookback window', () => {
  const previousLookback = process.env.ESPN_LOOKBACK_DAYS
  process.env.ESPN_LOOKBACK_DAYS = '7'

  const dateWindow = getEspnDateWindow(
    createData(
      createMatch({
        id: 'stale-group-match',
        stage: 'group',
        groupId: 'A',
        status: 'scheduled',
        kickoff: '2026-06-18T16:00:00Z',
        home: { teamId: 'mex' },
        away: { teamId: 'kor' },
        live: undefined,
      }),
    ),
    new Date('2026-07-01T12:00:00.000Z'),
  )

  if (previousLookback === undefined) {
    delete process.env.ESPN_LOOKBACK_DAYS
  } else {
    process.env.ESPN_LOOKBACK_DAYS = previousLookback
  }

  assert.ok(dateWindow.includes('20260618'))
  assert.ok(dateWindow.includes('20260617'))
})
