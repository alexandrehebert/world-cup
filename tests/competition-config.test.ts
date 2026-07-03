import assert from 'node:assert/strict'
import test from 'node:test'

import { getCompetitionProfile, resolveCompetitionId } from '../src/competitions'
import { getCompetitionBallIconNameById } from '../src/lib/competition-branding'
import { hasBracketSection, hasGroupsSection } from '../src/lib/tournament-sections'

test('resolveCompetitionId falls back to world cup when the value is not recognized', () => {
  assert.equal(resolveCompetitionId(undefined), 'world-cup-2026')
  assert.equal(resolveCompetitionId('unknown-competition'), 'world-cup-2026')
})

test('resolveCompetitionId supports the nations championship profile', () => {
  assert.equal(resolveCompetitionId('nations-championship-2026'), 'nations-championship-2026')
})

test('nations championship profile uses dedicated storage defaults', () => {
  const profile = getCompetitionProfile('nations-championship-2026')
  assert.equal(profile.localDataFile, '2026-rugby-nations-championship.json')
  assert.equal(profile.blobDataFile, 'nations-championship-2026/tournament.json')
  assert.equal(profile.defaultMongoDbName, 'nations-championship-2026')
})

test('nations championship profile defines a default world rugby schedule endpoint', () => {
  const profile = getCompetitionProfile('nations-championship-2026')
  assert.equal(
    profile.defaultMatchResultsUrl,
    'https://api.wr-rims-prod.pulselive.com/rugby/v3/event/46294cf5-dee3-4234-957a-dbe1f08049f2/schedule',
  )
})

test('rugby competition uses rugby matches icon', () => {
  assert.equal(getCompetitionBallIconNameById('nations-championship-2026'), 'sports_rugby')
  assert.equal(getCompetitionBallIconNameById('world-cup-2026'), 'sports_soccer')
})

test('sections visibility depends on available data', () => {
  assert.equal(hasGroupsSection([]), false)
  assert.equal(
    hasGroupsSection([
      {
        id: 'a',
        label: 'A',
        teamIds: [],
        standings: [],
        matchIds: [],
      },
    ]),
    true,
  )

  assert.equal(
    hasBracketSection([
      {
        id: 'roundOf16',
        matchIds: [],
      },
    ]),
    false,
  )
  assert.equal(
    hasBracketSection([
      {
        id: 'semiFinal',
        matchIds: ['m1'],
      },
    ]),
    true,
  )
})
