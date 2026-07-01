import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveGroupBracketTeams } from '../src/lib/bracket'
import type { BracketRoundRecord, GroupRecord, MatchRecord } from '../src/types/tournament'

const groups: GroupRecord[] = [
  {
    id: 'A',
    label: 'Group A',
    teamIds: ['usa', 'mex', 'can', 'crc'],
    standings: [
      { teamId: 'usa', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 6, goalsAgainst: 2, points: 7 },
      { teamId: 'mex', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, points: 6 },
      { teamId: 'can', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 4, points: 3 },
      { teamId: 'crc', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 1, goalsAgainst: 6, points: 1 },
    ],
    matchIds: ['ga1', 'ga2', 'ga3', 'ga4', 'ga5', 'ga6'],
  },
  {
    id: 'B',
    label: 'Group B',
    teamIds: ['bra', 'arg', 'uru', 'chi'],
    standings: [
      { teamId: 'bra', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 7, goalsAgainst: 1, points: 9 },
      { teamId: 'arg', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 2, points: 6 },
      { teamId: 'uru', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 4, points: 3 },
      { teamId: 'chi', played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 1, goalsAgainst: 8, points: 0 },
    ],
    matchIds: ['gb1', 'gb2', 'gb3', 'gb4', 'gb5', 'gb6'],
  },
]

const groupMatches: MatchRecord[] = [
  'ga1', 'ga2', 'ga3', 'ga4', 'ga5', 'ga6', 'gb1', 'gb2', 'gb3', 'gb4', 'gb5', 'gb6',
].map((id, index) => ({
  id,
  stage: 'group',
  groupId: index < 6 ? 'A' : 'B',
  home: {},
  away: {},
  kickoff: '2026-06-20T20:00:00Z',
  venue: {
    stadium: 'Example Stadium',
    city: 'Example City',
    country: 'Example Country',
    timeZone: 'UTC',
  },
  status: 'finished',
}))

const knockoutMatches: MatchRecord[] = [
  {
    id: 'r32-1',
    stage: 'roundOf32',
    roundId: 'roundOf32',
    home: { placeholder: 'G1:A', score: 2 },
    away: { placeholder: 'G2:B', score: 1 },
    kickoff: '2026-06-29T20:00:00Z',
    venue: {
      stadium: 'Example Stadium',
      city: 'Example City',
      country: 'Example Country',
      timeZone: 'UTC',
    },
    status: 'finished',
  },
  {
    id: 'r32-2',
    stage: 'roundOf32',
    roundId: 'roundOf32',
    home: { placeholder: 'G1:B', score: 1 },
    away: { placeholder: 'G2:A', score: 3 },
    kickoff: '2026-06-30T20:00:00Z',
    venue: {
      stadium: 'Example Stadium',
      city: 'Example City',
      country: 'Example Country',
      timeZone: 'UTC',
    },
    status: 'finished',
  },
  {
    id: 'qf-1',
    stage: 'quarterFinal',
    roundId: 'quarterFinal',
    home: { placeholder: 'W:roundOf32:1' },
    away: { placeholder: 'W:roundOf32:2' },
    kickoff: '2026-07-03T20:00:00Z',
    venue: {
      stadium: 'Example Stadium',
      city: 'Example City',
      country: 'Example Country',
      timeZone: 'UTC',
    },
    status: 'scheduled',
  },
]

const bracketRounds: BracketRoundRecord[] = [
  { id: 'roundOf32', matchIds: ['r32-1', 'r32-2'] },
  { id: 'quarterFinal', matchIds: ['qf-1'] },
]

test('resolveGroupBracketTeams propagates finished knockout winners to the next round', () => {
  const resolvedMatches = resolveGroupBracketTeams(
    [...groupMatches, ...knockoutMatches],
    groups,
    bracketRounds,
  )

  const quarterFinal = resolvedMatches.find((match) => match.id === 'qf-1')

  assert.ok(quarterFinal)
  assert.equal(quarterFinal.home.teamId, 'usa')
  assert.equal(quarterFinal.away.teamId, 'mex')
})

test('resolveGroupBracketTeams resolves group placeholders when standings are complete even if statuses are stale', () => {
  const staleGroupMatches = groupMatches.map((match) => ({ ...match, status: 'scheduled' as const }))
  const staleKnockoutMatch: MatchRecord = {
    id: 'r32-stale',
    stage: 'roundOf32',
    roundId: 'roundOf32',
    home: { placeholder: 'G1:A' },
    away: { placeholder: 'G2:B' },
    kickoff: '2026-06-29T20:00:00Z',
    venue: {
      stadium: 'Example Stadium',
      city: 'Example City',
      country: 'Example Country',
      timeZone: 'UTC',
    },
    status: 'scheduled',
  }

  const resolvedMatches = resolveGroupBracketTeams(
    [...staleGroupMatches, staleKnockoutMatch],
    groups,
    [{ id: 'roundOf32', matchIds: ['r32-stale'] }],
  )

  const roundOf32 = resolvedMatches.find((match) => match.id === 'r32-stale')
  assert.ok(roundOf32)
  assert.equal(roundOf32.home.teamId, 'usa')
  assert.equal(roundOf32.away.teamId, 'arg')
})

test('resolveGroupBracketTeams resolves G3 placeholders once all referenced groups are complete', () => {
  const candidateGroups: GroupRecord[] = [
    {
      id: 'C',
      label: 'Group C',
      teamIds: ['c1', 'c2', 'c3', 'c4'],
      standings: [
        { teamId: 'c1', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, points: 9 },
        { teamId: 'c2', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, points: 6 },
        { teamId: 'c3', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, points: 4 },
        { teamId: 'c4', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 2, goalsAgainst: 6, points: 1 },
      ],
      matchIds: [],
    },
    {
      id: 'E',
      label: 'Group E',
      teamIds: ['e1', 'e2', 'e3', 'e4'],
      standings: [
        { teamId: 'e1', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 7, goalsAgainst: 1, points: 9 },
        { teamId: 'e2', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, points: 6 },
        { teamId: 'e3', played: 3, won: 0, drawn: 2, lost: 1, goalsFor: 3, goalsAgainst: 4, points: 2 },
        { teamId: 'e4', played: 3, won: 0, drawn: 2, lost: 1, goalsFor: 2, goalsAgainst: 5, points: 2 },
      ],
      matchIds: [],
    },
    {
      id: 'F',
      label: 'Group F',
      teamIds: ['f1', 'f2', 'f3', 'f4'],
      standings: [
        { teamId: 'f1', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 6, goalsAgainst: 2, points: 7 },
        { teamId: 'f2', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, points: 4 },
        { teamId: 'f3', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 5, points: 3 },
        { teamId: 'f4', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 4, points: 3 },
      ],
      matchIds: [],
    },
    {
      id: 'H',
      label: 'Group H',
      teamIds: ['h1', 'h2', 'h3', 'h4'],
      standings: [
        { teamId: 'h1', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 5, goalsAgainst: 2, points: 7 },
        { teamId: 'h2', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3, points: 6 },
        { teamId: 'h3', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 2, goalsAgainst: 5, points: 1 },
        { teamId: 'h4', played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 1, goalsAgainst: 4, points: 0 },
      ],
      matchIds: [],
    },
    {
      id: 'I',
      label: 'Group I',
      teamIds: ['i1', 'i2', 'i3', 'i4'],
      standings: [
        { teamId: 'i1', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, points: 6 },
        { teamId: 'i2', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, points: 4 },
        { teamId: 'i3', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 3, points: 4 },
        { teamId: 'i4', played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 1, goalsAgainst: 6, points: 0 },
      ],
      matchIds: [],
    },
  ]

  const matchWithG3Placeholder: MatchRecord = {
    id: 'r32-g3',
    stage: 'roundOf32',
    roundId: 'roundOf32',
    home: { placeholder: 'G1:C' },
    away: { placeholder: 'G3:CEFHI' },
    kickoff: '2026-06-29T20:00:00Z',
    venue: {
      stadium: 'Example Stadium',
      city: 'Example City',
      country: 'Example Country',
      timeZone: 'UTC',
    },
    status: 'scheduled',
  }

  const resolvedMatches = resolveGroupBracketTeams(
    [matchWithG3Placeholder],
    candidateGroups,
    [{ id: 'roundOf32', matchIds: ['r32-g3'] }],
  )

  const roundOf32 = resolvedMatches.find((match) => match.id === 'r32-g3')
  assert.ok(roundOf32)
  assert.equal(roundOf32.home.teamId, 'c1')
  assert.equal(roundOf32.away.teamId, 'c3')
})
