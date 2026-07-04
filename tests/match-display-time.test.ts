import assert from 'node:assert/strict'
import test from 'node:test'

import { getLiveStatusDetail, getLocalizedCountryName, getLocalizedText, getMatchDisplayTime } from '../src/lib/format'
import { en } from '../src/translations/en'
import { fr } from '../src/translations/fr'
import type { MatchRecord } from '../src/types/tournament'
import { buildCompetitionNotifications } from '../src/components/notifications/competition-notifications'

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

test('getLiveStatusDetail maps world rugby L1 and L2 to localized half-time labels', () => {
  assert.equal(getLiveStatusDetail('L1', 'fr'), '1re mi-temps')
  assert.equal(getLiveStatusDetail('L2', 'fr'), '2e mi-temps')
  assert.equal(getLiveStatusDetail('L1', 'en'), '1st half')
  assert.equal(getLiveStatusDetail('L2', 'en'), '2nd half')
})

test('getLiveStatusDetail expands HT and FT shorthands into readable localized labels', () => {
  assert.equal(getLiveStatusDetail('HT', 'en', en.labels), en.labels.halfTime)
  assert.equal(getLiveStatusDetail('FT', 'en', en.labels), en.labels.fullTime)
  assert.equal(getLiveStatusDetail('HT', 'fr', fr.labels), fr.labels.halfTime)
  assert.equal(getLiveStatusDetail('FT', 'fr', fr.labels), fr.labels.fullTime)
})

test('getMatchDisplayTime avoids raw FT token for live matches when feed status lags', () => {
  const displayTime = getMatchDisplayTime(createLiveMatch('FT'), en.labels, Date.now(), 'en')
  assert.equal(displayTime, en.labels.fullTime)
})

test('getLocalizedText returns the locale-specific country name when available', () => {
  const country = { en: 'Germany', fr: 'Allemagne' }

  assert.equal(getLocalizedText(country, 'fr'), 'Allemagne')
  assert.equal(getLocalizedText(country, 'en'), 'Germany')
})

test('getLocalizedCountryName translates known venue countries', () => {
  assert.equal(getLocalizedCountryName('United States', 'fr'), 'États-Unis')
  assert.equal(getLocalizedCountryName('Wales', 'fr'), 'Pays de Galles')
  assert.equal(getLocalizedCountryName('France', 'en'), 'France')
})

test('buildCompetitionNotifications uses localized team labels in notification text', () => {
  const result = buildCompetitionNotifications({
    upcomingMatches: [
      {
        id: 'm1',
        stage: 'group',
        home: { teamId: 'can', score: 1 },
        away: { teamId: 'mar', score: 0 },
        kickoff: '2026-07-04T15:00:00Z',
        venue: { stadium: 'Estadio', city: 'Mexico City', country: 'Mexico', timeZone: 'UTC' },
        status: 'finished',
      },
    ],
    teamsById: {
      can: { id: 'can', name: 'Canada', code: 'CAN', flagCode: 'ca' },
      mar: { id: 'mar', name: 'Morocco', code: 'MAR', flagCode: 'ma' },
    },
    teamLabels: {
      can: 'Canada',
      mar: 'Maroc',
    },
    locale: 'fr',
    labels: fr.labels,
    nowMs: Date.now(),
  })

  const renderedText = result.notifications.flatMap((notification) => notification.tokens).map((token) => token.value).join(' ')
  assert.match(renderedText, /Canada/)
  assert.match(renderedText, /Maroc/)
})
