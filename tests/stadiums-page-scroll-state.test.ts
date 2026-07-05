import assert from 'node:assert/strict'
import test from 'node:test'

import { buildStadiumNavigationState, getStadiumListScrollTopFromState } from '../src/lib/stadiums-navigation-state'

test('buildStadiumNavigationState preserves existing state and stores non-negative scroll top', () => {
  const result = buildStadiumNavigationState({ source: 'list' }, 320)

  assert.deepEqual(result, {
    source: 'list',
    stadiumsListScrollTop: 320,
  })
})

test('buildStadiumNavigationState clamps negative scroll top to zero', () => {
  const result = buildStadiumNavigationState(null, -12)

  assert.deepEqual(result, {
    stadiumsListScrollTop: 0,
  })
})

test('getStadiumListScrollTopFromState returns stored value only when valid', () => {
  assert.equal(getStadiumListScrollTopFromState({ stadiumsListScrollTop: 144 }), 144)
  assert.equal(getStadiumListScrollTopFromState({ stadiumsListScrollTop: -1 }), null)
  assert.equal(getStadiumListScrollTopFromState({ stadiumsListScrollTop: '144' }), null)
  assert.equal(getStadiumListScrollTopFromState(undefined), null)
})
