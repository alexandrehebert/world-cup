import { NextRequest, NextResponse } from 'next/server'
import { parseSessionToken, sessionCookieName } from '../../../server/auth'
import {
  getPrediction,
  listPredictionsByUser,
  listPublicPredictionDistributions,
  upsertPrediction,
} from '../../../server/kv-store'
import { loadTournamentData } from '../../../server/tournament-data'
import type { MatchOutcome, PredictionType } from '../../../types/predictions'
import { isPredictionsFeatureEnabled } from '../../../lib/features'

type UpsertPredictionBody = {
  matchId?: string
  type?: PredictionType
  outcome?: MatchOutcome
  homeScore?: number
  awayScore?: number
}

const GUEST_PREDICTOR_COOKIE_NAME = 'wc_guest_predictor'
const GUEST_PREDICTOR_ID_REGEX = /^[a-z0-9_-]{16,64}$/

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

const resolveRequesterUserId = (request: NextRequest) => {
  const session = getSessionUser(request)

  if (session) {
    return session.id
  }

  const guestPredictorId = request.cookies.get(GUEST_PREDICTOR_COOKIE_NAME)?.value?.trim() ?? ''
  return GUEST_PREDICTOR_ID_REGEX.test(guestPredictorId) ? `guest:${guestPredictorId}` : null
}

export async function GET(request: NextRequest) {
  if (!isPredictionsFeatureEnabled) {
    return NextResponse.json({ error: 'Predictions feature is disabled' }, { status: 404 })
  }

  const requesterUserId = resolveRequesterUserId(request)

  try {
    const [predictions, tournamentData] = await Promise.all([
      requesterUserId ? listPredictionsByUser(requesterUserId) : Promise.resolve([]),
      loadTournamentData(),
    ])
    const openMatchIds = tournamentData.matches
      .filter((match) => match.status === 'scheduled' && new Date(match.kickoff).getTime() > Date.now())
      .map((match) => match.id)
    const predictionDistributions = await listPublicPredictionDistributions(openMatchIds)

    return NextResponse.json({ predictions, predictionDistributions }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Unable to load predictions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isPredictionsFeatureEnabled) {
    return NextResponse.json({ error: 'Predictions feature is disabled' }, { status: 404 })
  }

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

    const [predictionDistribution] = await listPublicPredictionDistributions([matchId])

    return NextResponse.json({ prediction, predictionDistribution }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Unable to save prediction' }, { status: 500 })
  }
}
