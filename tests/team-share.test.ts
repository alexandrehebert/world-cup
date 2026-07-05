import assert from 'node:assert/strict'
import test from 'node:test'

import { findTeamByCode, getTeamCompetitionDetails } from '../src/lib/team-share'
import type { TournamentData } from '../src/types/tournament'

const baseTournament: TournamentData = {
  meta: {
    competitionId: 'fifa-world-cup-2026',
    edition: 'FIFA World Cup 2026',
    season: '2026',
    host: 'North America',
    updatedAt: '2026-06-01T00:00:00.000Z',
    venueCountry: 'United States',
  },
  teams: [
    { id: 'arg', code: 'ARG', name: 'Argentina', flagCode: 'ar' },
    { id: 'fra', code: 'FRA', name: 'France', flagCode: 'fr' },
    { id: 'eng', code: 'ENG', name: 'England', flagCode: 'gb-eng' },
  ],
  groups: [
    {
      id: 'group-a',
      label: 'Group A',
      teamIds: ['arg', 'fra', 'eng'],
      standings: [
        { teamId: 'arg', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 6, goalsAgainst: 2, points: 7 },
        { teamId: 'fra', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, points: 6 },
        { teamId: 'eng', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, points: 4 },
      ],
      matchIds: ['m1', 'm2', 'm3'],
    },
  ],
  matches: [
    {
      id: 'm1',
      stage: 'final',
      home: { teamId: 'arg', score: 2 },
      away: { teamId: 'fra', score: 1 },
      kickoff: '2026-07-19T19:00:00.000Z',
      venue: { stadium: 'MetLife Stadium', city: 'New York', country: 'USA', timeZone: 'UTC' },
      status: 'finished',
    },
    {
      id: 'm2',
      stage: 'semiFinal',
      home: { teamId: 'fra', score: 1 },
      away: { teamId: 'eng', score: 0 },
      kickoff: '2026-07-12T19:00:00.000Z',
      venue: { stadium: 'Stadium', city: 'City', country: 'USA', timeZone: 'UTC' },
      status: 'finished',
    },
    {
      id: 'm3',
      stage: 'group',
      groupId: 'group-a',
      home: { teamId: 'eng' },
      away: { teamId: 'arg' },
      kickoff: '2026-06-15T19:00:00.000Z',
      venue: { stadium: 'Stadium', city: 'City', country: 'USA', timeZone: 'UTC' },
      status: 'scheduled',
    },
  ],
  bracketRounds: [],
}

test('findTeamByCode resolves normalized team paths', () => {
  assert.equal(findTeamByCode(baseTournament.teams, 'arg')?.id, 'arg')
  assert.equal(findTeamByCode(baseTournament.teams, 'A-R_G')?.id, 'arg')
  assert.equal(findTeamByCode(baseTournament.teams, 'unknown'), null)
})

test('getTeamCompetitionDetails marks final winner as champion', () => {
  const data: TournamentData = {
    ...baseTournament,
    matches: [baseTournament.matches[0]],
  }

  const details = getTeamCompetitionDetails({
    teamId: 'arg',
    data,
    nowMs: Date.parse('2026-07-20T12:00:00.000Z'),
  })

  assert.equal(details.status, 'champion')
})

test('getTeamCompetitionDetails marks knocked out finalists as eliminated', () => {
  const data: TournamentData = {
    ...baseTournament,
    matches: [baseTournament.matches[0]],
  }

  const details = getTeamCompetitionDetails({
    teamId: 'fra',
    data,
    nowMs: Date.parse('2026-07-20T12:00:00.000Z'),
  })

  assert.equal(details.status, 'eliminated')
})

test('getTeamCompetitionDetails keeps teams with upcoming fixtures active', () => {
  const details = getTeamCompetitionDetails({
    teamId: 'eng',
    data: baseTournament,
    nowMs: Date.parse('2026-06-10T12:00:00.000Z'),
  })

  assert.equal(details.status, 'active')
  assert.equal(details.nextMatch?.id, 'm3')
})
