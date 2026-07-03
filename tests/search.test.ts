import assert from 'node:assert/strict'
import test from 'node:test'

import { isSearchMatch, normalizeSearchText } from '../src/lib/search'

test('normalizeSearchText removes accents and punctuation', () => {
  assert.equal(normalizeSearchText(" Côte d'Ivoire "), 'cote d ivoire')
})

test('isSearchMatch supports accent-insensitive matching', () => {
  assert.equal(isSearchMatch('cote', ["Côte d'Ivoire", 'CIV']), true)
})

test('isSearchMatch supports typo-tolerant matching for team names', () => {
  assert.equal(isSearchMatch('argentinna', ['Argentina', 'ARG']), true)
  assert.equal(isSearchMatch('portugl', ['Portugal', 'POR']), true)
})

test('isSearchMatch keeps short code matching strict', () => {
  assert.equal(isSearchMatch('fra', ['France', 'FRA']), true)
  assert.equal(isSearchMatch('frx', ['France', 'FRA']), false)
})

test('isSearchMatch returns false when no candidate is close enough', () => {
  assert.equal(isSearchMatch('zzzz', ['Mexico', 'MEX']), false)
})
