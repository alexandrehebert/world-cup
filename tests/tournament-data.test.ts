import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { applyCanonicalVenueData, loadTournamentData, writeLocalTournamentData } from '../src/server/tournament-data'
import type { TournamentData } from '../src/types/tournament'

const createTournamentData = (
  matchById: Record<string, {
    stadium: string
    kickoff?: string
    homePlaceholder?: string
    awayPlaceholder?: string
    homeTeamId?: string
    awayTeamId?: string
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
  matches: Object.entries(matchById).map(([id, match]) => {
    const homeTeamId = match.homeTeamId ?? (match.homePlaceholder ? undefined : 'a')
    const awayTeamId = match.awayTeamId ?? (match.awayPlaceholder ? undefined : 'b')

    return {
      id,
      stage: 'group',
      groupId: 'A',
      home: {
        ...(match.homePlaceholder ? { placeholder: match.homePlaceholder } : {}),
        ...(homeTeamId ? { teamId: homeTeamId } : {}),
      },
      away: {
        ...(match.awayPlaceholder ? { placeholder: match.awayPlaceholder } : {}),
        ...(awayTeamId ? { teamId: awayTeamId } : {}),
      },
      kickoff: match.kickoff ?? '2026-06-11T19:00:00.000Z',
      venue: {
        stadium: match.stadium,
        city: 'Mexico City',
        country: 'Mexico',
        timeZone: 'America/Mexico_City',
      },
      status: 'scheduled',
    }
  }),
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

test('applyCanonicalVenueData restores incorrect bracket team IDs from canonical local data', () => {
  // Simulates the case where blob data has a wrong away team (e.g. 'ecu' instead of 'gha')
  // due to a stale ESPN sync that matched the wrong event to a bracket match by kickoff time.
  const blobData = createTournamentData({
    m87: { stadium: 'Arrowhead Stadium', homeTeamId: 'col', awayTeamId: 'ecu', homePlaceholder: 'G1:K', awayPlaceholder: 'G3:DEIJL' },
  })
  const localData = createTournamentData({
    m87: { stadium: 'Arrowhead Stadium', homeTeamId: 'col', awayTeamId: 'gha', homePlaceholder: 'G1:K', awayPlaceholder: 'G3:DEIJL' },
  })

  const merged = applyCanonicalVenueData(blobData, localData)

  assert.equal(merged.matches[0]?.home.teamId, 'col')
  assert.equal(merged.matches[0]?.away.teamId, 'gha')
})

test('applyCanonicalVenueData restores stale kickoff times from canonical local data', () => {
  const blobData = createTournamentData({
    m89: { stadium: 'Lincoln Financial Field', kickoff: '2026-07-04T22:00:00Z' },
  })
  const localData = createTournamentData({
    m89: { stadium: 'Lincoln Financial Field', kickoff: '2026-07-04T21:00:00Z' },
  })

  const merged = applyCanonicalVenueData(blobData, localData)

  assert.equal(merged.matches[0]?.kickoff, '2026-07-04T21:00:00Z')
})

test('applyCanonicalVenueData does not override blob team IDs when canonical has no teamId', () => {
  // When canonical only has a placeholder (team not yet determined), blob's resolved teamId should be kept.
  const blobData = createTournamentData({
    m95: { stadium: 'SoFi Stadium', homeTeamId: 'arg', awayTeamId: 'col', homePlaceholder: 'W:roundOf32:14', awayPlaceholder: 'W:roundOf32:16' },
  })
  const localData = createTournamentData({
    m95: { stadium: 'SoFi Stadium', homePlaceholder: 'W:roundOf32:14', awayPlaceholder: 'W:roundOf32:16' },
  })

  const merged = applyCanonicalVenueData(blobData, localData)

  assert.equal(merged.matches[0]?.home.teamId, 'arg')
  assert.equal(merged.matches[0]?.away.teamId, 'col')
})

test('the France versus Paraguay round of 16 fixture keeps the corrected 5 PM kickoff', async () => {
  const dataPath = path.join(process.cwd(), 'src', 'data', '2026-football-world-cup.json')
  const raw = await fs.readFile(dataPath, 'utf8')
  const data = JSON.parse(raw) as TournamentData
  const match = data.matches.find((entry) => entry.id === 'm89')

  assert.ok(match)
  assert.equal(match?.kickoff, '2026-07-04T21:00:00Z')
  assert.equal(match?.live?.detail, 'Sat, July 4th at 5:00 PM EDT')
  assert.equal(match?.live?.startDate, '2026-07-04T21:00Z')
})

test('loadTournamentData repairs stale runtime kickoff values with canonical local data when blob sync is disabled', async () => {
  const temporaryRuntimeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-local-sync-'))
  const previousRuntimeDir = process.env.LOCAL_TOURNAMENT_DATA_DIR
  const previousCompetitionId = process.env.COMPETITION_ID
  const previousBlobToken = process.env.BLOB_READ_WRITE_TOKEN
  const dataPath = path.join(process.cwd(), 'src', 'data', '2026-football-world-cup.json')
  const raw = await fs.readFile(dataPath, 'utf8')
  const runtimeData = JSON.parse(raw) as TournamentData
  const staleMatch = runtimeData.matches.find((entry) => entry.id === 'm89')
  assert.ok(staleMatch)
  staleMatch.kickoff = '2026-07-04T22:00:00Z'

  process.env.LOCAL_TOURNAMENT_DATA_DIR = temporaryRuntimeDir
  process.env.COMPETITION_ID = 'world-cup-2026'
  delete process.env.BLOB_READ_WRITE_TOKEN

  try {
    await writeLocalTournamentData(runtimeData)

    const loaded = await loadTournamentData('world-cup-2026')
    const loadedMatch = loaded.matches.find((entry) => entry.id === 'm89')
    assert.ok(loadedMatch)
    assert.equal(loadedMatch.kickoff, '2026-07-04T21:00:00Z')
  } finally {
    if (previousRuntimeDir === undefined) {
      delete process.env.LOCAL_TOURNAMENT_DATA_DIR
    } else {
      process.env.LOCAL_TOURNAMENT_DATA_DIR = previousRuntimeDir
    }

    if (previousCompetitionId === undefined) {
      delete process.env.COMPETITION_ID
    } else {
      process.env.COMPETITION_ID = previousCompetitionId
    }

    if (previousBlobToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = previousBlobToken
    }

    await fs.rm(temporaryRuntimeDir, { recursive: true, force: true })
  }
})

test('writeLocalTournamentData stores local sync data in gitignored runtime directory', async () => {
  const temporaryRuntimeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-local-sync-'))
  const canonicalDataPath = path.join(process.cwd(), 'src', 'data', '2026-rugby-nations-championship.json')
  const canonicalBefore = await fs.readFile(canonicalDataPath, 'utf8')
  const previousRuntimeDir = process.env.LOCAL_TOURNAMENT_DATA_DIR
  const previousCompetitionId = process.env.COMPETITION_ID
  const previousBlobToken = process.env.BLOB_READ_WRITE_TOKEN

  process.env.LOCAL_TOURNAMENT_DATA_DIR = temporaryRuntimeDir
  process.env.COMPETITION_ID = 'nations-championship-2026'
  delete process.env.BLOB_READ_WRITE_TOKEN

  const runtimeData = createTournamentData({
    m1: { stadium: 'Runtime Stadium' },
  })
  runtimeData.meta.updatedAt = '2030-01-02T03:04:05.000Z'
  runtimeData.matches[0]!.status = 'finished'
  runtimeData.matches[0]!.home = { teamId: 'nzl', score: 34 }
  runtimeData.matches[0]!.away = { teamId: 'fra', score: 32 }

  try {
    await writeLocalTournamentData(runtimeData)

    const runtimeDataPath = path.join(temporaryRuntimeDir, '2026-rugby-nations-championship.json')
    const runtimeRaw = await fs.readFile(runtimeDataPath, 'utf8')
    const runtimeParsed = JSON.parse(runtimeRaw) as TournamentData

    assert.equal(runtimeParsed.meta.updatedAt, '2030-01-02T03:04:05.000Z')
    assert.equal(runtimeParsed.matches[0]?.home.score, 34)
    assert.equal(runtimeParsed.matches[0]?.away.score, 32)

    const loaded = await loadTournamentData('nations-championship-2026')
    assert.equal(loaded.meta.updatedAt, '2030-01-02T03:04:05.000Z')
    assert.equal(loaded.matches[0]?.home.score, 34)
    assert.equal(loaded.matches[0]?.away.score, 32)

    const canonicalAfter = await fs.readFile(canonicalDataPath, 'utf8')
    assert.equal(canonicalAfter, canonicalBefore)
  } finally {
    if (previousRuntimeDir === undefined) {
      delete process.env.LOCAL_TOURNAMENT_DATA_DIR
    } else {
      process.env.LOCAL_TOURNAMENT_DATA_DIR = previousRuntimeDir
    }

    if (previousCompetitionId === undefined) {
      delete process.env.COMPETITION_ID
    } else {
      process.env.COMPETITION_ID = previousCompetitionId
    }

    if (previousBlobToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = previousBlobToken
    }
    await fs.rm(temporaryRuntimeDir, { recursive: true, force: true })
  }
})
