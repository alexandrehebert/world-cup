import assert from 'node:assert/strict'
import test from 'node:test'

import { hasWorldRugbyStandingsRows, normalizeWorldRugbyStatus, recomputeGroups } from '../src/server/sync-matches'
import type { TournamentData } from '../src/types/tournament'

test('normalizeWorldRugbyStatus maps U to scheduled', () => {
  assert.equal(normalizeWorldRugbyStatus('U', 0), 'scheduled')
})

test('normalizeWorldRugbyStatus maps C to finished', () => {
  assert.equal(normalizeWorldRugbyStatus('C', 0), 'finished')
})

test('normalizeWorldRugbyStatus maps L to live', () => {
  assert.equal(normalizeWorldRugbyStatus('L', 0), 'live')
})

test('normalizeWorldRugbyStatus falls back to live when clock is running', () => {
  assert.equal(normalizeWorldRugbyStatus(undefined, 120), 'live')
})

test('hasWorldRugbyStandingsRows returns false when standings tables are empty', () => {
  assert.equal(hasWorldRugbyStandingsRows([{ entries: [] }, { rows: [] }, { teams: [] }]), false)
})

test('hasWorldRugbyStandingsRows returns true when one table includes standings rows', () => {
  assert.equal(hasWorldRugbyStandingsRows([{ entries: [] }, { rows: [{ points: 1 }] }]), true)
})

test('recomputeGroups includes finished group matches when groupId differs but teams match the group', () => {
  const groups: TournamentData['groups'] = [
    {
      id: 'group-1',
      label: 'Pool 1',
      teamIds: ['fra', 'eng'],
      standings: [
        { teamId: 'fra', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
        { teamId: 'eng', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
      ],
      matchIds: ['m1'],
    },
  ]

  const matches: TournamentData['matches'] = [
    {
      id: 'm1',
      stage: 'group',
      groupId: 'pool-1',
      home: { teamId: 'fra', score: 27 },
      away: { teamId: 'eng', score: 19 },
      kickoff: '2025-02-01T12:00:00.000Z',
      venue: { stadium: 'Stade de France', city: 'Saint-Denis', country: 'France', timeZone: 'UTC' },
      status: 'finished',
    },
  ]

  const [result] = recomputeGroups(groups, matches)
  const standingsByTeamId = new Map(result.standings.map((entry) => [entry.teamId, entry]))

  assert.equal(standingsByTeamId.get('fra')?.played, 1)
  assert.equal(standingsByTeamId.get('fra')?.won, 1)
  assert.equal(standingsByTeamId.get('fra')?.points, 3)
  assert.equal(standingsByTeamId.get('eng')?.played, 1)
  assert.equal(standingsByTeamId.get('eng')?.lost, 1)
  assert.equal(standingsByTeamId.get('eng')?.points, 0)
})

test('recomputeGroups supports cross-conference standings when group teams only play outside their conference', () => {
  const groups: TournamentData['groups'] = [
    {
      id: 'european-conference',
      label: 'European Conference',
      teamIds: ['fra', 'eng'],
      standings: [
        { teamId: 'fra', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
        { teamId: 'eng', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
      ],
      matchIds: [],
    },
  ]

  const matches: TournamentData['matches'] = [
    {
      id: 'm1',
      stage: 'group',
      home: { teamId: 'fra', score: 21 },
      away: { teamId: 'nzl', score: 10 },
      kickoff: '2026-07-01T12:00:00.000Z',
      venue: { stadium: 'Stade de France', city: 'Saint-Denis', country: 'France', timeZone: 'UTC' },
      status: 'finished',
    },
    {
      id: 'm2',
      stage: 'group',
      home: { teamId: 'eng', score: 18 },
      away: { teamId: 'rsa', score: 18 },
      kickoff: '2026-07-02T12:00:00.000Z',
      venue: { stadium: 'Twickenham', city: 'London', country: 'England', timeZone: 'UTC' },
      status: 'finished',
    },
  ]

  const [result] = recomputeGroups(groups, matches)
  const standingsByTeamId = new Map(result.standings.map((entry) => [entry.teamId, entry]))

  assert.equal(standingsByTeamId.get('fra')?.played, 1)
  assert.equal(standingsByTeamId.get('fra')?.won, 1)
  assert.equal(standingsByTeamId.get('fra')?.points, 3)
  assert.equal(standingsByTeamId.get('eng')?.played, 1)
  assert.equal(standingsByTeamId.get('eng')?.drawn, 1)
  assert.equal(standingsByTeamId.get('eng')?.points, 1)
})
