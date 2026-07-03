import assert from 'node:assert/strict'
import test from 'node:test'

import { getCompetitionProfile, resolveCompetitionId } from '../src/competitions'
import { getCompetitionBallIconNameById } from '../src/lib/competition-branding'
import { getStandingsSectionPath, getStandingsSectionSlug, hidesGroupStageLabel, usesStandingsSectionPath } from '../src/lib/competition-sections'
import { hasBracketSection, hasGroupsSection } from '../src/lib/tournament-sections'

test('resolveCompetitionId falls back to world cup when the value is not recognized', () => {
  assert.equal(resolveCompetitionId(undefined), 'world-cup-2026')
  assert.equal(resolveCompetitionId('unknown-competition'), 'world-cup-2026')
})

test('resolveCompetitionId supports the nations championship profile', () => {
  assert.equal(resolveCompetitionId('nations-championship-2026'), 'nations-championship-2026')
  assert.equal(resolveCompetitionId('six-nations-championship-2025'), 'six-nations-championship-2025')
  assert.equal(resolveCompetitionId('six-nations-championship-2026'), 'six-nations-championship-2026')
  assert.equal(resolveCompetitionId('six-nations-championship'), 'six-nations-championship-2026')
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

test('six nations championship profile defines a default world rugby schedule endpoint', () => {
  const profile = getCompetitionProfile('six-nations-championship-2026')
  assert.equal(profile.localDataFile, '2026-rugby-six-nations-championship.json')
  assert.equal(profile.blobDataFile, 'six-nations-championship-2026/tournament.json')
  assert.equal(
    profile.defaultMatchResultsUrl,
    'https://api.wr-rims-prod.pulselive.com/rugby/v3/event/b6832e99-0c73-4d56-ba57-725935c2f1dd/schedule',
  )
})

test('six nations championship 2025 profile remains available for archived season data', () => {
  const profile = getCompetitionProfile('six-nations-championship-2025')
  assert.equal(profile.localDataFile, '2025-rugby-six-nations-championship.json')
  assert.equal(profile.blobDataFile, 'six-nations-championship-2025/tournament.json')
  assert.equal(
    profile.defaultMatchResultsUrl,
    'https://api.wr-rims-prod.pulselive.com/rugby/v3/event/62bf5a1b-f6a7-452f-ae17-5a378e77917e/schedule',
  )
})

test('rugby competition uses rugby matches icon', () => {
  assert.equal(getCompetitionBallIconNameById('nations-championship-2026'), 'sports_rugby')
  assert.equal(getCompetitionBallIconNameById('six-nations-championship-2025'), 'sports_rugby')
  assert.equal(getCompetitionBallIconNameById('six-nations-championship-2026'), 'sports_rugby')
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

test('six nations competition uses standings section path', () => {
  assert.equal(usesStandingsSectionPath('six-nations-championship-2025'), true)
  assert.equal(getStandingsSectionPath('six-nations-championship-2025'), '/standings')
  assert.equal(getStandingsSectionSlug('six-nations-championship-2025'), 'standings')
  assert.equal(hidesGroupStageLabel('six-nations-championship-2025'), true)
  assert.equal(usesStandingsSectionPath('six-nations-championship-2026'), true)
  assert.equal(getStandingsSectionPath('six-nations-championship-2026'), '/standings')
  assert.equal(getStandingsSectionSlug('six-nations-championship-2026'), 'standings')
  assert.equal(hidesGroupStageLabel('six-nations-championship-2026'), true)
})

test('world cup and nations championship keep groups section path', () => {
  assert.equal(usesStandingsSectionPath('world-cup-2026'), false)
  assert.equal(getStandingsSectionPath('world-cup-2026'), '/groups')
  assert.equal(getStandingsSectionSlug('world-cup-2026'), 'groups')
  assert.equal(hidesGroupStageLabel('world-cup-2026'), false)
  assert.equal(usesStandingsSectionPath('nations-championship-2026'), false)
  assert.equal(getStandingsSectionPath('nations-championship-2026'), '/groups')
  assert.equal(getStandingsSectionSlug('nations-championship-2026'), 'groups')
  assert.equal(hidesGroupStageLabel('nations-championship-2026'), false)
})
