import assert from 'node:assert/strict'
import test from 'node:test'

import { isFeatureFlagEnabled } from '../src/lib/features'

test('isFeatureFlagEnabled enables known truthy values', () => {
  assert.equal(isFeatureFlagEnabled('true'), true)
  assert.equal(isFeatureFlagEnabled('1'), true)
  assert.equal(isFeatureFlagEnabled('yes'), true)
  assert.equal(isFeatureFlagEnabled('on'), true)
  assert.equal(isFeatureFlagEnabled(' TRUE '), true)
})

test('isFeatureFlagEnabled disables missing and non-truthy values', () => {
  assert.equal(isFeatureFlagEnabled(undefined), false)
  assert.equal(isFeatureFlagEnabled(''), false)
  assert.equal(isFeatureFlagEnabled('false'), false)
  assert.equal(isFeatureFlagEnabled('0'), false)
  assert.equal(isFeatureFlagEnabled('off'), false)
})
