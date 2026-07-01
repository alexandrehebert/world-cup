import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMatchPathKey, buildTbdMatchPathKey, parseMatchPathname, parseMatchSlugSegments } from '../src/lib/match-path'

test('buildMatchPathKey includes the match stage to avoid collisions', () => {
  assert.equal(buildMatchPathKey('group', 'ENG', 'COD'), 'group/ENG/vs/COD')
  assert.equal(buildMatchPathKey('quarterFinal', 'ENG', 'COD'), 'quarter-final/ENG/vs/COD')
})

test('parseMatchPathname reads the stageful match URL format', () => {
  const parsed = parseMatchPathname('/match/group/ENG/vs/COD')

  assert.deepEqual(parsed, {
    section: 'match',
    stage: 'group',
    pathKey: 'group/ENG/vs/COD',
    isLegacy: false,
  })
})

test('parseMatchPathname accepts legacy camelCase stage slugs', () => {
  const parsed = parseMatchPathname('/bracket/semiFinal/PAR/vs/FRA')

  assert.deepEqual(parsed, {
    section: 'bracket',
    stage: 'semiFinal',
    pathKey: 'semi-final/PAR/vs/FRA',
    isLegacy: false,
  })
})

test('buildTbdMatchPathKey uses kebab-case round slugs', () => {
  assert.equal(buildTbdMatchPathKey('quarterFinal', 0), 'tbd/quarter-final/1')
  assert.equal(buildTbdMatchPathKey('semiFinal', 2), 'tbd/semi-final/3')
})

test('parseMatchPathname reads kebab-case tbd bracket paths', () => {
  const parsed = parseMatchPathname('/bracket/tbd/quarter-final/1')

  assert.deepEqual(parsed, {
    section: 'bracket',
    stage: null,
    pathKey: 'tbd/quarter-final/1',
    isLegacy: false,
  })
})

test('parseMatchSlugSegments supports both new and legacy slug layouts', () => {
  assert.deepEqual(parseMatchSlugSegments(['match', 'group', 'ENG', 'vs', 'COD']), {
    section: 'match',
    stage: 'group',
    homeCode: 'ENG',
    awayCode: 'COD',
  })

  assert.deepEqual(parseMatchSlugSegments(['match', 'ENG', 'vs', 'COD']), {
    section: 'match',
    stage: null,
    homeCode: 'ENG',
    awayCode: 'COD',
  })

  assert.deepEqual(parseMatchSlugSegments(['bracket', 'semiFinal', 'PAR', 'vs', 'FRA']), {
    section: 'bracket',
    stage: 'semiFinal',
    homeCode: 'PAR',
    awayCode: 'FRA',
  })
})
