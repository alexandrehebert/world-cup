import assert from 'node:assert/strict'
import test from 'node:test'

import { getMatchWinner } from '../src/lib/format'
import type { MatchRecord } from '../src/types/tournament'

const createFinishedMatch = (overrides: Partial<MatchRecord> = {}): MatchRecord => ({
  id: 'm1',
  stage: 'roundOf32',
  roundId: 'roundOf32',
  home: {
    teamId: 'ger',
    score: 1,
  },
  away: {
    teamId: 'par',
    score: 1,
  },
  kickoff: '2026-06-29T20:30:00Z',
  venue: {
    stadium: 'Gillette Stadium',
    city: 'Foxborough',
    country: 'United States',
    timeZone: 'America/New_York',
  },
  status: 'finished',
  ...overrides,
})

test('getMatchWinner uses penalty scores when knockout matches finish level after extra time', () => {
  const winner = getMatchWinner(
    createFinishedMatch({
      home: {
        teamId: 'ger',
        score: 1,
        penaltyScore: 3,
      },
      away: {
        teamId: 'par',
        score: 1,
        penaltyScore: 4,
      },
    }),
  )

  assert.equal(winner, 'away')
})

test('getMatchWinner returns null for finished ties without penalty data', () => {
  const winner = getMatchWinner(createFinishedMatch())
  assert.equal(winner, null)
})
