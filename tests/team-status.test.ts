import assert from 'node:assert/strict'
import test from 'node:test'

import { isTeamEliminated } from '../src/lib/team-status'
import type { TournamentData } from '../src/types/tournament'

const sixNationsGroups: TournamentData['groups'] = [
  {
    id: 'group-1',
    label: 'Pool 1',
    teamIds: ['fra', 'eng'],
    standings: [
      { teamId: 'fra', played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 27, goalsAgainst: 19, points: 3 },
      { teamId: 'eng', played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 19, goalsAgainst: 27, points: 0 },
    ],
    matchIds: ['m1'],
  },
]

const finishedSixNationsMatches: TournamentData['matches'] = [
  {
    id: 'm1',
    stage: 'group',
    groupId: 'pool-1',
    home: { teamId: 'fra', score: 27 },
    away: { teamId: 'eng', score: 19 },
    kickoff: '2025-03-15T15:00:00.000Z',
    venue: { stadium: 'Stade de France', city: 'Saint-Denis', country: 'France', timeZone: 'UTC' },
    status: 'finished',
  },
]

test('six nations does not mark teams as eliminated because it has no bracket phase', () => {
  const nowMs = Date.parse('2025-03-16T12:00:00.000Z')

  assert.equal(
    isTeamEliminated({
      teamId: 'fra',
      matches: finishedSixNationsMatches,
      nowMs,
      competitionId: 'six-nations-championship-2025',
      groups: sixNationsGroups,
    }),
    false,
  )

  assert.equal(
    isTeamEliminated({
      teamId: 'eng',
      matches: finishedSixNationsMatches,
      nowMs,
      competitionId: 'six-nations-championship-2025',
      groups: sixNationsGroups,
    }),
    false,
  )
})

test('six nations does not force elimination before the competition is finished', () => {
  const nowMs = Date.parse('2025-02-01T12:00:00.000Z')
  const ongoingMatches: TournamentData['matches'] = [
    ...finishedSixNationsMatches,
    {
      id: 'm2',
      stage: 'group',
      groupId: 'pool-1',
      home: { teamId: 'eng' },
      away: { teamId: 'fra' },
      kickoff: '2025-03-20T15:00:00.000Z',
      venue: { stadium: 'Twickenham', city: 'London', country: 'England', timeZone: 'UTC' },
      status: 'scheduled',
    },
  ]

  assert.equal(
    isTeamEliminated({
      teamId: 'fra',
      matches: ongoingMatches,
      nowMs,
      competitionId: 'six-nations-championship-2025',
      groups: sixNationsGroups,
    }),
    false,
  )
})

test('nations championship does not mark teams as eliminated because it has no bracket phase', () => {
  const nowMs = Date.parse('2026-08-01T12:00:00.000Z')

  assert.equal(
    isTeamEliminated({
      teamId: 'fra',
      matches: finishedSixNationsMatches,
      nowMs,
      competitionId: 'nations-championship-2026',
      groups: sixNationsGroups,
    }),
    false,
  )
  assert.equal(
    isTeamEliminated({
      teamId: 'eng',
      matches: finishedSixNationsMatches,
      nowMs,
      competitionId: 'nations-championship-2026',
      groups: sixNationsGroups,
    }),
    false,
  )
})
