import assert from 'node:assert/strict'
import test from 'node:test'

import { getMatchDisplayTime } from '../src/lib/format'
import { en } from '../src/translations/en'
import { fr } from '../src/translations/fr'
import type { MatchRecord } from '../src/types/tournament'

const createFinishedMatch = (detail: string): MatchRecord => ({
  id: 'm-finished',
  stage: 'roundOf16',
  roundId: 'roundOf16',
  home: {
    teamId: 'ger',
    score: 1,
    penaltyScore: 3,
  },
  away: {
    teamId: 'par',
    score: 1,
    penaltyScore: 4,
  },
  kickoff: '2026-06-29T20:30:00Z',
  venue: {
    stadium: 'Gillette Stadium',
    city: 'Foxborough',
    country: 'United States',
    timeZone: 'America/New_York',
  },
  status: 'finished',
  live: {
    detail,
    shortDetail: detail,
  },
})

const createLiveMatch = (detail: string): MatchRecord => ({
  id: 'm-live',
  stage: 'group',
  home: {
    teamId: 'fij',
    score: 7,
  },
  away: {
    teamId: 'wal',
    score: 5,
  },
  kickoff: '2026-07-04T13:10:00Z',
  venue: {
    stadium: 'Cardiff City Stadium',
    city: 'Cardiff',
    country: 'Wales',
    timeZone: 'UTC',
  },
  status: 'live',
  live: {
    detail,
    shortDetail: detail,
  },
})

test('getMatchDisplayTime maps FT-Pens to a clear localized status in English', () => {
  const displayTime = getMatchDisplayTime(createFinishedMatch('FT-Pens'), en.labels, Date.now(), 'en')
  assert.equal(displayTime, en.labels.afterPenalties)
})

test('getMatchDisplayTime maps FT-Pens to a clear localized status in French', () => {
  const displayTime = getMatchDisplayTime(createFinishedMatch('FT-Pens'), fr.labels, Date.now(), 'fr')
  assert.equal(displayTime, fr.labels.afterPenalties)
})

test('getMatchDisplayTime maps AET to the localized extra-time status', () => {
  const displayTime = getMatchDisplayTime(createFinishedMatch('AET'), en.labels, Date.now(), 'en')
  assert.equal(displayTime, en.labels.afterExtraTime)
})

test('getMatchDisplayTime maps world rugby C status to localized full-time text', () => {
  const displayTime = getMatchDisplayTime(createFinishedMatch('C'), en.labels, Date.now(), 'en')
  assert.equal(displayTime, en.labels.fullTime)
})

test('getMatchDisplayTime maps world rugby L1 to a readable first-half label in English', () => {
  const displayTime = getMatchDisplayTime(createLiveMatch('L1'), en.labels, Date.now(), 'en')
  assert.equal(displayTime, '1st half')
})

test('getMatchDisplayTime maps world rugby L2 to a readable second-half label in French', () => {
  const displayTime = getMatchDisplayTime(createLiveMatch('L2'), fr.labels, Date.now(), 'fr')
  assert.equal(displayTime, '2e mi-temps')
})
