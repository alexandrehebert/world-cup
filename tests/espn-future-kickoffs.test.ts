import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import type { MatchRecord, TournamentData } from '../src/types/tournament'

const ESPN_VALIDATE_FUTURE_FIXTURES = process.env.ESPN_VALIDATE_FUTURE_FIXTURES === '1'

const toUtcDateKey = (value: string) => {
  const date = new Date(value)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const toIsoInstant = (value: string) => new Date(value).toISOString()

const toKickoffHistogram = (matches: MatchRecord[], nowMs: number) => {
  const histogram = new Map<string, number>()

  for (const match of matches) {
    if (match.status !== 'scheduled') {
      continue
    }

    const kickoffMs = new Date(match.kickoff).getTime()
    if (!Number.isFinite(kickoffMs) || kickoffMs <= nowMs) {
      continue
    }

    const kickoffIso = new Date(kickoffMs).toISOString()
    histogram.set(kickoffIso, (histogram.get(kickoffIso) ?? 0) + 1)
  }

  return histogram
}

const toHistogramObject = (histogram: Map<string, number>) =>
  Object.fromEntries([...histogram.entries()].sort(([a], [b]) => a.localeCompare(b)))

test(
  'canonical future scheduled match kickoffs stay aligned with ESPN scoreboard',
  {
    skip: ESPN_VALIDATE_FUTURE_FIXTURES ? false : 'Set ESPN_VALIDATE_FUTURE_FIXTURES=1 to enable live ESPN validation.',
  },
  async () => {
    const dataPath = path.join(process.cwd(), 'src', 'data', '2026-football-world-cup.json')
    const raw = await fs.readFile(dataPath, 'utf8')
    const data = JSON.parse(raw) as TournamentData
    const nowMs = Date.now()

    const canonicalKickoffHistogram = toKickoffHistogram(data.matches, nowMs)
    const dateKeys = new Set<string>()
    for (const kickoffIso of canonicalKickoffHistogram.keys()) {
      dateKeys.add(toUtcDateKey(kickoffIso))
    }

    const espnKickoffHistogram = new Map<string, number>()
    for (const dateKey of [...dateKeys].sort()) {
      const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateKey}`
      const response = await fetch(scoreboardUrl, { cache: 'no-store' })
      assert.equal(response.ok, true, `Expected ESPN request to succeed for ${dateKey} (${response.status}).`)

      const payload = await response.json() as { events?: Array<{ date?: string }> }
      const events = payload.events ?? []
      for (const event of events) {
        if (typeof event.date !== 'string') {
          continue
        }

        const kickoffIso = toIsoInstant(event.date)
        if (new Date(kickoffIso).getTime() <= nowMs) {
          continue
        }

        espnKickoffHistogram.set(kickoffIso, (espnKickoffHistogram.get(kickoffIso) ?? 0) + 1)
      }
    }

    assert.deepEqual(
      toHistogramObject(canonicalKickoffHistogram),
      toHistogramObject(espnKickoffHistogram),
      'Future canonical kickoff timestamps must match ESPN scoreboard timestamps.',
    )
  },
)
