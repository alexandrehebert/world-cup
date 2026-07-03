import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeWorldRugbyStatus } from '../src/server/sync-matches'

test('normalizeWorldRugbyStatus maps U to scheduled', () => {
  assert.equal(normalizeWorldRugbyStatus('U', 0), 'scheduled')
})

test('normalizeWorldRugbyStatus maps C to finished', () => {
  assert.equal(normalizeWorldRugbyStatus('C', 0), 'finished')
})

test('normalizeWorldRugbyStatus maps L to live', () => {
  assert.equal(normalizeWorldRugbyStatus('L', 0), 'live')
})

test('normalizeWorldRugbyStatus falls back to live when clock is running', () => {
  assert.equal(normalizeWorldRugbyStatus(undefined, 120), 'live')
})
