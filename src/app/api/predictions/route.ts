import { NextRequest, NextResponse } from 'next/server'
import { parseSessionToken, sessionCookieName } from '../../../server/auth'
import { getPrediction, upsertPrediction, listPredictionDistributions, listPredictionsByUser } from '../../../server/kv-store'
import { loadTournamentData } from '../../../server/tournament-data'
import type { MatchOutcome, PredictionType } from '../../../types/predictions'

type UpsertPredictionBody = {
  matchId?: string
  type?: PredictionType
  outcome?: MatchOutcome
  homeScore?: number
  awayScore?: number
}

const normalizeScore = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value)
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)

    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed)
    }
  }

  return undefined
}

const toOutcomeFromScore = (homeScore: number, awayScore: number): MatchOutcome => {
  if (homeScore > awayScore) {
    return 'home'
  }

  if (homeScore < awayScore) {
    return 'away'
  }

  return 'draw'
}

const getSessionUser = (request: NextRequest) => {
  const token = request.cookies.get(sessionCookieName)?.value
  return parseSessionToken(token)
}

export async function GET(request: NextRequest) {
  const session = getSessionUser(request)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [predictions, tournamentData] = await Promise.all([listPredictionsByUser(session.id), loadTournamentData()])
    const openMatchIds = tournamentData.matches
      .filter((match) => match.status === 'scheduled' && new Date(match.kickoff).getTime() > Date.now())
      .map((match) => match.id)
    const predictionDistributions = await listPredictionDistributions(openMatchIds)

    return NextResponse.json({ predictions, predictionDistributions }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Unable to load predictions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as UpsertPredictionBody
    const matchId = String(body.matchId ?? '').trim()
    const type = body.type

    if (!matchId) {
      return NextResponse.json({ error: 'Match is required' }, { status: 400 })
    }

    if (type !== 'outcome' && type !== 'score') {
      return NextResponse.json({ error: 'Invalid prediction type' }, { status: 400 })
    }

    const tournamentData = await loadTournamentData()
    const match = tournamentData.matches.find((entry) => entry.id === matchId)

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.status !== 'scheduled' || new Date(match.kickoff).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Predictions are closed for this match' }, { status: 400 })
    }

    let outcome: MatchOutcome | undefined
    let homeScore: number | undefined
    let awayScore: number | undefined

    if (type === 'outcome') {
      if (body.outcome !== 'home' && body.outcome !== 'draw' && body.outcome !== 'away') {
        return NextResponse.json({ error: 'Invalid outcome prediction' }, { status: 400 })
      }

      outcome = body.outcome
    } else {
      homeScore = normalizeScore(body.homeScore)
      awayScore = normalizeScore(body.awayScore)

      if (homeScore === undefined || awayScore === undefined) {
        return NextResponse.json({ error: 'Invalid score prediction' }, { status: 400 })
      }

      outcome = toOutcomeFromScore(homeScore, awayScore)
    }

    const existing = await getPrediction(session.id, matchId)

    const prediction = await upsertPrediction({
      userId: session.id,
      displayName: session.username,
      matchId,
      type,
      outcome,
      homeScore,
      awayScore,
      pointsAwarded: existing?.pointsAwarded ?? 0,
    })

    const [predictionDistribution] = await listPredictionDistributions([matchId])

    return NextResponse.json({ prediction, predictionDistribution }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Unable to save prediction' }, { status: 500 })
  }
}
