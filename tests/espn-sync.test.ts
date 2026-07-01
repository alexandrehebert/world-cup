import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractPenaltyScore,
  isPenaltyShootoutCompetition,
  mergeEspnSummaryShootoutScores,
} from '../src/server/espn-sync'

test('mergeEspnSummaryShootoutScores adds shootout tallies when scoreboard data omits them', () => {
  const event = {
    id: '760489',
    competitions: [
      {
        status: {
          type: {
            detail: 'FT-Pens',
          },
        },
        competitors: [
          {
            homeAway: 'home',
            score: '1',
            linescores: null,
            team: {
              id: '481',
              abbreviation: 'GER',
            },
          },
          {
            homeAway: 'away',
            score: '1',
            linescores: null,
            team: {
              id: '210',
              abbreviation: 'PAR',
            },
          },
        ],
      },
    ],
  }

  const summary = {
    shootout: [
      {
        id: '481',
        shots: [{ didScore: false }, { didScore: true }, { didScore: true }, { didScore: false }, { didScore: true }, { didScore: false }],
      },
      {
        id: '210',
        shots: [{ didScore: true }, { didScore: true }, { didScore: true }, { didScore: false }, { didScore: false }, { didScore: true }],
      },
    ],
  }

  const merged = mergeEspnSummaryShootoutScores(event, summary)
  const competitors = merged.competitions?.[0]?.competitors ?? []

  assert.equal(extractPenaltyScore(competitors[0]!), 3)
  assert.equal(extractPenaltyScore(competitors[1]!), 4)
})

test('mergeEspnSummaryShootoutScores preserves existing penalty linescores', () => {
  const event = {
    id: '760490',
    competitions: [
      {
        competitors: [
          {
            homeAway: 'home',
            linescores: [{ points: 5, period: { type: { name: 'shootout' } } }],
            team: {
              id: '1',
            },
          },
        ],
      },
    ],
  }

  const merged = mergeEspnSummaryShootoutScores(event, {
    shootout: [{ id: '1', shots: [{ didScore: true }] }],
  })

  assert.deepEqual(merged, event)
})

test('isPenaltyShootoutCompetition detects FT-Pens finals', () => {
  assert.equal(
    isPenaltyShootoutCompetition({
      status: {
        type: {
          name: 'STATUS_FINAL_PEN',
          detail: 'FT-Pens',
        },
      },
    }),
    true,
  )
})
