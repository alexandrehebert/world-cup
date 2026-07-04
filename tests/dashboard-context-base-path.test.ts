import assert from 'node:assert/strict'
import test from 'node:test'

import { getDashboardBasePathname } from '../src/contexts/dashboard-context'

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
  assert.equal(getDashboardBasePathname('/overview', null), '/agenda')
})
