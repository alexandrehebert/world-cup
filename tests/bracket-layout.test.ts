import assert from 'node:assert/strict'
import test from 'node:test'

import { alignSideRoundsByNextRound } from '../src/lib/bracket-layout'
import type { MatchRecord } from '../src/types/tournament'

const makeMatch = (id: string, roundId: string, homePlaceholder?: string, awayPlaceholder?: string): MatchRecord => ({
  id,
  stage: roundId as MatchRecord['stage'],
  roundId,
  home: homePlaceholder ? { placeholder: homePlaceholder } : {},
  away: awayPlaceholder ? { placeholder: awayPlaceholder } : {},
  kickoff: '2026-07-01T00:00:00Z',
  venue: {
    stadium: 'Example Stadium',
    city: 'Example City',
    country: 'Example Country',
    timeZone: 'UTC',
  },
  status: 'scheduled',
})

test('alignSideRoundsByNextRound reorders outer rounds using the already-aligned inner rounds', () => {
  const rounds = [
    { id: 'roundOf32', matchIds: ['m73', 'm74', 'm75', 'm76', 'm77', 'm78', 'm79', 'm80', 'm81', 'm82', 'm83', 'm84', 'm85', 'm86', 'm87', 'm88'] },
    { id: 'roundOf16', matchIds: ['m89', 'm90', 'm91', 'm92', 'm93', 'm94', 'm95', 'm96'] },
    { id: 'quarterFinal', matchIds: ['m97', 'm98', 'm99', 'm100'] },
    { id: 'semiFinal', matchIds: ['m101', 'm102'] },
    { id: 'final', matchIds: ['m104'] },
  ]
  const matchesById = Object.fromEntries([
    makeMatch('m89', 'roundOf16', 'W:roundOf32:2', 'W:roundOf32:5'),
    makeMatch('m90', 'roundOf16', 'W:roundOf32:1', 'W:roundOf32:3'),
    makeMatch('m91', 'roundOf16', 'W:roundOf32:4', 'W:roundOf32:6'),
    makeMatch('m92', 'roundOf16', 'W:roundOf32:7', 'W:roundOf32:8'),
    makeMatch('m93', 'roundOf16', 'W:roundOf32:11', 'W:roundOf32:12'),
    makeMatch('m94', 'roundOf16', 'W:roundOf32:9', 'W:roundOf32:10'),
    makeMatch('m95', 'roundOf16', 'W:roundOf32:14', 'W:roundOf32:16'),
    makeMatch('m96', 'roundOf16', 'W:roundOf32:13', 'W:roundOf32:15'),
    makeMatch('m97', 'quarterFinal', 'W:roundOf16:1', 'W:roundOf16:2'),
    makeMatch('m98', 'quarterFinal', 'W:roundOf16:5', 'W:roundOf16:6'),
    makeMatch('m99', 'quarterFinal', 'W:roundOf16:3', 'W:roundOf16:4'),
    makeMatch('m100', 'quarterFinal', 'W:roundOf16:7', 'W:roundOf16:8'),
    makeMatch('m101', 'semiFinal', 'W:quarterFinal:1', 'W:quarterFinal:2'),
    makeMatch('m102', 'semiFinal', 'W:quarterFinal:3', 'W:quarterFinal:4'),
    makeMatch('m104', 'final', 'W:semiFinal:1', 'W:semiFinal:2'),
  ].map((match) => [match.id, match]))
  const roundMatchIdsById = new Map(rounds.map((round) => [round.id, round.matchIds]))

  const alignedRounds = alignSideRoundsByNextRound(rounds, matchesById, roundMatchIdsById)

  assert.deepEqual(alignedRounds[1]?.matchIds, ['m89', 'm90', 'm93', 'm94', 'm91', 'm92', 'm95', 'm96'])
  assert.deepEqual(alignedRounds[0]?.matchIds, ['m74', 'm77', 'm73', 'm75', 'm83', 'm84', 'm81', 'm82', 'm76', 'm78', 'm79', 'm80', 'm86', 'm88', 'm85', 'm87'])
})
