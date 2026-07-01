import assert from 'node:assert/strict'
import test from 'node:test'

import { applyCanonicalVenueData } from '../src/server/tournament-data'
import type { TournamentData } from '../src/types/tournament'

const createTournamentData = (stadiumByMatchId: Record<string, string>): TournamentData => ({
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
  matches: Object.entries(stadiumByMatchId).map(([id, stadium]) => ({
    id,
    stage: 'group',
    groupId: 'A',
    home: { teamId: 'a' },
    away: { teamId: 'b' },
    kickoff: '2026-06-11T19:00:00.000Z',
    venue: {
      stadium,
      city: 'Mexico City',
      country: 'Mexico',
      timeZone: 'America/Mexico_City',
    },
    status: 'scheduled',
  })),
})

test('applyCanonicalVenueData replaces stale venue names using canonical local data', () => {
  const blobData = createTournamentData({
    m1: 'Mexico City Stadium',
    m2: 'Atlanta Stadium',
  })
  const localData = createTournamentData({
    m1: 'Estadio Azteca',
    m2: 'Mercedes-Benz Stadium',
  })

  const merged = applyCanonicalVenueData(blobData, localData)

  assert.equal(merged.matches[0]?.venue.stadium, 'Estadio Azteca')
  assert.equal(merged.matches[1]?.venue.stadium, 'Mercedes-Benz Stadium')
})

test('applyCanonicalVenueData keeps matches that are not in canonical data unchanged', () => {
  const blobData = createTournamentData({
    m1: 'Mexico City Stadium',
    m2: 'Unmapped Stadium',
  })
  const localData = createTournamentData({
    m1: 'Estadio Azteca',
  })

  const merged = applyCanonicalVenueData(blobData, localData)

  assert.equal(merged.matches[0]?.venue.stadium, 'Estadio Azteca')
  assert.equal(merged.matches[1]?.venue.stadium, 'Unmapped Stadium')
})
