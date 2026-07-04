import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCompetitionSwitcherPath,
  buildCompetitionYearFragment,
  getCompetitionFamilyLabel,
  getCompetitionSeasonDetails,
  parseCompetitionIdFromFragment,
} from '../src/lib/competition-navigation'

test('getCompetitionSeasonDetails splits family id and year from competition id', () => {
  assert.deepEqual(getCompetitionSeasonDetails('six-nations-championship-2026'), {
    familyId: 'six-nations-championship',
    year: 2026,
  })
})

test('getCompetitionFamilyLabel removes trailing year from display names', () => {
  assert.equal(getCompetitionFamilyLabel('Six Nations Championship 2026'), 'Six Nations Championship')
  assert.equal(getCompetitionFamilyLabel('World Cup 2026'), 'World Cup')
})

test('buildCompetitionYearFragment omits fragment for the most recent championship year', () => {
  assert.equal(
    buildCompetitionYearFragment('six-nations-championship-2026', {
      'six-nations-championship': 2026,
    }),
    null,
  )
})

test('buildCompetitionYearFragment puts past championship year first in fragment', () => {
  assert.equal(
    buildCompetitionYearFragment('six-nations-championship-2025', {
      'six-nations-championship': 2026,
    }),
    '2025',
  )
})

test('buildCompetitionSwitcherPath keeps competition links on the home page', () => {
  assert.equal(buildCompetitionSwitcherPath(null), '/')
  assert.equal(buildCompetitionSwitcherPath('2025'), '/#2025')
})

test('parseCompetitionIdFromFragment resolves known year fragments', () => {
  assert.equal(
    parseCompetitionIdFromFragment('#2025', 'six-nations-championship-2026'),
    'six-nations-championship-2025',
  )
})

test('parseCompetitionIdFromFragment ignores unknown fragments', () => {
  assert.equal(parseCompetitionIdFromFragment('#2099', 'six-nations-championship-2026'), undefined)
  assert.equal(parseCompetitionIdFromFragment('#invalid-fragment'), undefined)
})

test('parseCompetitionIdFromFragment keeps legacy format compatibility', () => {
  assert.equal(
    parseCompetitionIdFromFragment('#2025-six-nations-championship'),
    'six-nations-championship-2025',
  )
})
