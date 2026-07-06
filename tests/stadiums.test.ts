import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildStadiumSlug,
  buildStadiumSlugIndex,
  buildStadiumMapMarkers,
  buildStadiumSummaries,
  getStadiumCatalogRecord,
  getStadiumMapViewport,
  isStadiumSearchMatch,
  normalizeStadiumSlug,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
} from '../src/lib/stadiums'
import type { MatchRecord } from '../src/types/tournament'

const createMatch = (partial: Partial<MatchRecord> & { id: string; kickoff: string; venue: MatchRecord['venue'] }): MatchRecord => ({
  id: partial.id,
  stage: partial.stage ?? 'group',
  home: partial.home ?? {},
  away: partial.away ?? {},
  kickoff: partial.kickoff,
  venue: partial.venue,
  status: partial.status ?? 'scheduled',
})

test('buildStadiumSummaries groups matches by stadium and country', () => {
  const summaries = buildStadiumSummaries([
    createMatch({
      id: 'm1',
      kickoff: '2026-06-11T19:00:00Z',
      venue: { stadium: 'AT&T Stadium', city: 'Dallas', country: 'United States', timeZone: 'America/Chicago' },
    }),
    createMatch({
      id: 'm2',
      kickoff: '2026-06-18T19:00:00Z',
      venue: { stadium: 'AT&T Stadium', city: 'Arlington', country: 'United States', timeZone: 'America/Chicago' },
    }),
    createMatch({
      id: 'm3',
      kickoff: '2026-06-21T19:00:00Z',
      venue: { stadium: 'AT&T Stadium', city: 'Arlington', country: 'United States', timeZone: 'America/Chicago' },
    }),
  ])

  assert.equal(summaries.length, 1)
  assert.equal(summaries[0].matchesHosted, 3)
  assert.equal(summaries[0].city, 'Arlington')
  assert.equal(summaries[0].firstKickoff, '2026-06-11T19:00:00Z')
  assert.equal(summaries[0].lastKickoff, '2026-06-21T19:00:00Z')
})

test('buildStadiumSummaries enriches known stadiums with seat capacity metadata', () => {
  const summaries = buildStadiumSummaries([
    createMatch({
      id: 'm1',
      kickoff: '2026-06-11T19:00:00Z',
      venue: { stadium: 'SoFi Stadium', city: 'Inglewood', country: 'United States', timeZone: 'America/Los_Angeles' },
    }),
  ])

  assert.equal(summaries.length, 1)
  assert.equal(summaries[0].seatCapacity, 70_240)
  assert.equal(summaries[0].openedYear, 2020)
})

test('getStadiumCatalogRecord returns undefined for unknown stadium names', () => {
  assert.equal(getStadiumCatalogRecord('Unknown Arena'), undefined)
})

test('buildStadiumMapMarkers projects known stadiums to map coordinates', () => {
  const summaries = buildStadiumSummaries([
    createMatch({
      id: 'm1',
      kickoff: '2026-06-11T19:00:00Z',
      venue: { stadium: 'BMO Field', city: 'Toronto', country: 'Canada', timeZone: 'America/Toronto' },
    }),
    createMatch({
      id: 'm2',
      kickoff: '2026-06-12T19:00:00Z',
      venue: { stadium: 'Unknown Arena', city: 'Nowhere', country: 'N/A', timeZone: 'UTC' },
    }),
  ])
  const markers = buildStadiumMapMarkers(summaries)

  assert.equal(markers.length, 1)
  assert.equal(markers[0].stadium, 'BMO Field')
  assert.equal(Math.round(markers[0].x), 101)
  assert.equal(Math.round(markers[0].y), 44)
})

test('buildStadiumMapMarkers falls back to country centroid when stadium is unknown', () => {
  const summaries = buildStadiumSummaries([
    createMatch({
      id: 'm1',
      kickoff: '2026-06-11T19:00:00Z',
      venue: { stadium: 'Unknown Arena', city: 'Dublin', country: 'Ireland', timeZone: 'Europe/Dublin' },
    }),
  ])

  const markers = buildStadiumMapMarkers(summaries)
  assert.equal(markers.length, 1)
  assert.ok(markers[0].x > 168 && markers[0].x < 176)
  assert.ok(markers[0].y > 30 && markers[0].y < 38)
})

test('getStadiumMapViewport zooms on marker cluster while staying within world map bounds', () => {
  const summaries = buildStadiumSummaries([
    createMatch({
      id: 'm1',
      kickoff: '2026-06-11T19:00:00Z',
      venue: { stadium: 'BMO Field', city: 'Toronto', country: 'Canada', timeZone: 'America/Toronto' },
    }),
    createMatch({
      id: 'm2',
      kickoff: '2026-06-12T19:00:00Z',
      venue: { stadium: 'Hard Rock Stadium', city: 'Miami Gardens', country: 'United States', timeZone: 'America/New_York' },
    }),
  ])

  const markers = buildStadiumMapMarkers(summaries)
  const viewport = getStadiumMapViewport(markers)

  assert.ok(viewport.width < WORLD_MAP_WIDTH)
  assert.ok(viewport.height < WORLD_MAP_HEIGHT)
  assert.ok(viewport.x >= 0)
  assert.ok(viewport.y >= 0)
  assert.ok(viewport.x + viewport.width <= WORLD_MAP_WIDTH)
  assert.ok(viewport.y + viewport.height <= WORLD_MAP_HEIGHT)
})

test('buildStadiumSlug creates a kebab-case stadium-city-country slug', () => {
  const slug = buildStadiumSlug({
    stadium: 'AT&T Stadium',
    city: 'Arlington',
    country: 'United States',
  })

  assert.equal(slug, 'at-t-stadium-arlington-united-states')
})

test('buildStadiumSlugIndex creates stable unique slugs for duplicate venues', () => {
  const first = {
    key: 'national stadium|country-a',
    stadium: 'National Stadium',
    city: 'Capital',
    country: 'Country A',
    timeZone: 'UTC',
    seatCapacity: null,
    openedYear: null,
    matchesHosted: 1,
    firstKickoff: '2026-06-11T19:00:00Z',
    lastKickoff: '2026-06-11T19:00:00Z',
  } as const
  const second = {
    key: 'national stadium|country-b',
    stadium: 'National Stadium',
    city: 'Capital',
    country: 'Country B',
    timeZone: 'UTC',
    seatCapacity: null,
    openedYear: null,
    matchesHosted: 1,
    firstKickoff: '2026-06-12T19:00:00Z',
    lastKickoff: '2026-06-12T19:00:00Z',
  } as const
  const duplicate = {
    key: 'national stadium duplicate|country-a',
    stadium: 'National Stadium',
    city: 'Capital',
    country: 'Country A',
    timeZone: 'UTC',
    seatCapacity: null,
    openedYear: null,
    matchesHosted: 1,
    firstKickoff: '2026-06-13T19:00:00Z',
    lastKickoff: '2026-06-13T19:00:00Z',
  } as const

  const { keyToSlug, slugToKey } = buildStadiumSlugIndex([first, second, duplicate])

  assert.equal(keyToSlug[first.key], 'national-stadium-capital-country-a')
  assert.equal(keyToSlug[second.key], 'national-stadium-capital-country-b')
  assert.equal(keyToSlug[duplicate.key], 'national-stadium-capital-country-a-2')
  assert.equal(slugToKey['national-stadium-capital-country-a'], first.key)
  assert.equal(slugToKey['national-stadium-capital-country-a-2'], duplicate.key)
})

test('normalizeStadiumSlug keeps URL slug parsing resilient', () => {
  assert.equal(normalizeStadiumSlug('  National---Stadium__Capital  '), 'national-stadium-capital')
  assert.equal(normalizeStadiumSlug('***'), 'stadium')
})

test('isStadiumSearchMatch matches across stadium metadata fields', () => {
  const summaries = buildStadiumSummaries([
    createMatch({
      id: 'm1',
      kickoff: '2026-06-11T19:00:00Z',
      venue: { stadium: 'SoFi Stadium', city: 'Inglewood', country: 'United States', timeZone: 'America/Los_Angeles' },
    }),
  ])
  const stadium = summaries[0]

  assert.equal(isStadiumSearchMatch('inglewood', stadium), true)
  assert.equal(isStadiumSearchMatch('los angeles', stadium), true)
  assert.equal(isStadiumSearchMatch('70240', stadium), true)
  assert.equal(isStadiumSearchMatch('2020', stadium), true)
  assert.equal(isStadiumSearchMatch('2026-06-11', stadium), true)
  assert.equal(isStadiumSearchMatch('dublin', stadium), false)
})
