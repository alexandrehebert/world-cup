import assert from 'node:assert/strict'
import test from 'node:test'

import { getDashboardBasePathname, getSelectedMatchModalUrl } from '../src/contexts/dashboard-context'

test('getDashboardBasePathname falls back to matches when closing direct match routes', () => {
  assert.equal(getDashboardBasePathname('/match/group/ENG/vs/FRA', null), '/matches')
})

test('getDashboardBasePathname restores the originating page for match modal closes', () => {
  assert.equal(getDashboardBasePathname('/match/group/ENG/vs/FRA', '/agenda'), '/agenda')
})

test('getDashboardBasePathname keeps existing team and section fallbacks', () => {
  assert.equal(getDashboardBasePathname('/team/FRA', null), '/teams')
  assert.equal(getDashboardBasePathname('/team/FRA', '/agenda'), '/agenda')
  assert.equal(getDashboardBasePathname('/bracket/final/FRA/vs/ENG', null), '/bracket')
  assert.equal(getDashboardBasePathname('/predict/group/FRA/vs/ENG', null), '/predict')
  assert.equal(getDashboardBasePathname('/overview', null), '/')
})

test('getSelectedMatchModalUrl keeps active search params for path-based match routes', () => {
  assert.equal(
    getSelectedMatchModalUrl('/bracket', 'semiFinal/FRA/vs/ENG', '?view=condensed&team=FRA'),
    '/bracket/semiFinal/FRA/vs/ENG?view=condensed&team=FRA',
  )
})

test('getSelectedMatchModalUrl keeps query-only match routes unchanged', () => {
  assert.equal(
    getSelectedMatchModalUrl('/match', '?match=abc123', '?view=condensed'),
    '/match?match=abc123',
  )
})
