import assert from 'node:assert/strict'
import test from 'node:test'

import { isParaguayEasterEggTeamPath } from '../src/lib/team-route'

test('isParaguayEasterEggTeamPath only matches the paraguay team path segment', () => {
  assert.equal(isParaguayEasterEggTeamPath('paraguay'), true)
  assert.equal(isParaguayEasterEggTeamPath('PARAGUAY'), true)
  assert.equal(isParaguayEasterEggTeamPath(' paraguay '), true)
  assert.equal(isParaguayEasterEggTeamPath('para-guay'), true)
  assert.equal(isParaguayEasterEggTeamPath('FRA'), false)
  assert.equal(isParaguayEasterEggTeamPath(undefined), false)
})
