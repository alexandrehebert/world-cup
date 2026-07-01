import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveKickoffFallbackMatchId } from '../src/server/sync-matches'

test('resolveKickoffFallbackMatchId matches unresolved bracket slot within fallback window', () => {
  const matchId = resolveKickoffFallbackMatchId(
    '2026-07-01T02:00:00Z',
    [
      { matchId: 'm79', kickoff: '2026-07-01T01:00:00Z' },
      { matchId: 'm80', kickoff: '2026-07-01T16:00:00Z' },
    ],
  )

  assert.equal(matchId, 'm79')
})

test('resolveKickoffFallbackMatchId returns undefined when closest candidates are tied', () => {
  const matchId = resolveKickoffFallbackMatchId(
    '2026-07-01T02:00:00Z',
    [
      { matchId: 'mA', kickoff: '2026-07-01T01:00:00Z' },
      { matchId: 'mB', kickoff: '2026-07-01T03:00:00Z' },
    ],
  )

  assert.equal(matchId, undefined)
})

test('resolveKickoffFallbackMatchId returns undefined when all candidates are outside window', () => {
  const matchId = resolveKickoffFallbackMatchId(
    '2026-07-01T02:00:00Z',
    [{ matchId: 'm79', kickoff: '2026-07-01T08:00:00Z' }],
  )

  assert.equal(matchId, undefined)
})
