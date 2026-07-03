import assert from 'node:assert/strict'
import test from 'node:test'

import { getMatchDayKey, getTodayMatchDayKey } from '../src/lib/format'

test('getTodayMatchDayKey uses the provided timezone near UTC midnight', () => {
  const nowMs = new Date('2026-07-03T00:18:00.000Z').getTime()

  assert.equal(getTodayMatchDayKey(nowMs, 'America/Toronto'), '2026-07-02')
})

test('getMatchDayKey stays stable for kickoff timestamps in the same timezone', () => {
  assert.equal(getMatchDayKey('2026-07-03T00:30:00.000Z', 'America/Toronto'), '2026-07-02')
  assert.equal(getMatchDayKey('2026-07-03T00:30:00.000Z', 'UTC'), '2026-07-03')
})
