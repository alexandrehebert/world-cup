import assert from 'node:assert/strict'
import test from 'node:test'

import { applyCanonicalVenueData } from '../src/server/tournament-data'
import type { TournamentData } from '../src/types/tournament'

const createTournamentData = (
  matchById: Record<string, {
    stadium: string
    homePlaceholder?: string
    awayPlaceholder?: string
  }>,
): TournamentData => ({
  meta: {
    edition: '2026',
    season: '2026',
    host: 'North America',
    updatedAt: '2026-01-01T00:00:00.000Z',
    venueCountry: 'United States',
  },
  teams: [],
  groups: [],
  bracketRounds: [],
  matches: Object.entries(matchById).map(([id, match]) => ({
    id,
    stage: 'group',
    groupId: 'A',
    home: match.homePlaceholder ? { placeholder: match.homePlaceholder } : { teamId: 'a' },
    away: match.awayPlaceholder ? { placeholder: match.awayPlaceholder } : { teamId: 'b' },
    kickoff: '2026-06-11T19:00:00.000Z',
    venue: {
      stadium: match.stadium,
      city: 'Mexico City',
      country: 'Mexico',
      timeZone: 'America/Mexico_City',
    },
    status: 'scheduled',
  })),
})

test('applyCanonicalVenueData replaces stale venue names using canonical local data', () => {
  const blobData = createTournamentData({
    m1: { stadium: 'Mexico City Stadium' },
    m2: { stadium: 'Atlanta Stadium' },
  })
  const localData = createTournamentData({
    m1: { stadium: 'Estadio Azteca' },
    m2: { stadium: 'Mercedes-Benz Stadium' },
  })

  const merged = applyCanonicalVenueData(blobData, localData)

  assert.equal(merged.matches[0]?.venue.stadium, 'Estadio Azteca')
  assert.equal(merged.matches[1]?.venue.stadium, 'Mercedes-Benz Stadium')
})

test('applyCanonicalVenueData keeps matches that are not in canonical data unchanged', () => {
  const blobData = createTournamentData({
    m1: { stadium: 'Mexico City Stadium' },
    m2: { stadium: 'Unmapped Stadium' },
  })
  const localData = createTournamentData({
    m1: { stadium: 'Estadio Azteca' },
  })

  const merged = applyCanonicalVenueData(blobData, localData)

  assert.equal(merged.matches[0]?.venue.stadium, 'Estadio Azteca')
  assert.equal(merged.matches[1]?.venue.stadium, 'Unmapped Stadium')
})

test('applyCanonicalVenueData restores stale bracket placeholders from canonical local data', () => {
  const blobData = createTournamentData({
    m1: { stadium: 'Mexico City Stadium', homePlaceholder: 'W:roundOf32:11', awayPlaceholder: 'W:roundOf32:12' },
  })
  const localData = createTournamentData({
    m1: { stadium: 'Estadio Azteca', homePlaceholder: 'W:semiFinal:1', awayPlaceholder: 'W:semiFinal:2' },
  })

  const merged = applyCanonicalVenueData(blobData, localData)

  assert.equal(merged.matches[0]?.home.placeholder, 'W:semiFinal:1')
  assert.equal(merged.matches[0]?.away.placeholder, 'W:semiFinal:2')
})
