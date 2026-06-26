import { createHash, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { parseSessionToken, sessionCookieName } from '../../../../server/auth'
import {
  getPrediction,
  listPredictionsByMatch,
  listPublicPredictionsByMatch,
  upsertPrediction,
} from '../../../../server/kv-store'
import { loadTournamentData } from '../../../../server/tournament-data'
import type { MatchOutcome, PredictionType } from '../../../../types/predictions'

type PublicPredictionBody = {
  matchId?: string
  type?: PredictionType
  outcome?: MatchOutcome
  homeScore?: number | string
  awayScore?: number | string
  guestName?: string
}

const GUEST_PREDICTOR_COOKIE_NAME = 'wc_guest_predictor'
const GUEST_PREDICTOR_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 365
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
  if (homeScore > awayScore) return 'home'
  if (homeScore < awayScore) return 'away'
  return 'draw'
}

const resolveMatch = async (matchId: string) => {
  const tournamentData = await loadTournamentData()
  return tournamentData.matches.find((entry) => entry.id === matchId)
}

const buildDistributionFromPredictions = (
  matchId: string,
  predictions: Array<{ outcome: MatchOutcome }>,
) => {
  let homeCount = 0
  let drawCount = 0
  let awayCount = 0

  for (const prediction of predictions) {
    if (prediction.outcome === 'home') {
      homeCount += 1
    } else if (prediction.outcome === 'draw') {
      drawCount += 1
    } else {
      awayCount += 1
    }
  }

  return {
    matchId,
    homeCount,
    drawCount,
    awayCount,
    totalPredictions: homeCount + drawCount + awayCount,
  }
}

const resolveGuestPredictorId = (request: NextRequest) => {
  const existingCookieValue = request.cookies.get(GUEST_PREDICTOR_COOKIE_NAME)?.value?.trim() ?? ''

  if (GUEST_PREDICTOR_ID_REGEX.test(existingCookieValue)) {
    return { predictorId: existingCookieValue }
  }

  return {
    predictorId: randomUUID().replace(/-/g, ''),
  }
}

const resolveRequesterUserId = (request: NextRequest) => {
  const session = parseSessionToken(request.cookies.get(sessionCookieName)?.value)
  if (session) {
    return session.id
  }

  const guestPredictorId = request.cookies.get(GUEST_PREDICTOR_COOKIE_NAME)?.value?.trim() ?? ''
  return GUEST_PREDICTOR_ID_REGEX.test(guestPredictorId) ? `guest:${guestPredictorId}` : null
}

const getRequestIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  return forwardedFor || realIp || null
}

const toIpHash = (ip: string) => {
  const secret = process.env.SESSION_SECRET ?? 'dev-only-change-me'
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex')
}

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('matchId')?.trim() ?? ''

  if (!matchId) {
    return NextResponse.json({ error: 'Match is required' }, { status: 400 })
  }

  try {
    const predictions = await listPublicPredictionsByMatch(matchId)
    const currentPredictorId = resolveRequesterUserId(request)
    const currentPrediction = currentPredictorId
      ? predictions.find((prediction) => prediction.userId === currentPredictorId) ?? null
      : null

    return NextResponse.json({
      predictions,
      predictionDistribution: buildDistributionFromPredictions(matchId, predictions),
      currentPredictorId,
      currentPrediction,
    }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Unable to load predictions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PublicPredictionBody
    const matchId = String(body.matchId ?? '').trim()
    const type = body.type

    if (!matchId) {
      return NextResponse.json({ error: 'Match is required' }, { status: 400 })
    }

    if (type !== 'outcome' && type !== 'score') {
      return NextResponse.json({ error: 'Invalid prediction type' }, { status: 400 })
    }

    const match = await resolveMatch(matchId)

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.status !== 'scheduled' || new Date(match.kickoff).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Predictions are closed for this match' }, { status: 400 })
    }

    const session = parseSessionToken(request.cookies.get(sessionCookieName)?.value)
    const guestName = String(body.guestName ?? '').trim()
    const guestPredictor = session ? null : resolveGuestPredictorId(request)
    const userId = session ? session.id : `guest:${guestPredictor?.predictorId ?? ''}`
    const requestIp = getRequestIp(request)
    const sourceIpHash = !session && requestIp ? toIpHash(requestIp) : undefined

    let outcome: MatchOutcome
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

    const existing = await getPrediction(userId, matchId)
    const displayName = session ? session.username : (existing?.displayName?.trim() || guestName)

    if (!displayName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!session && sourceIpHash) {
      const existingMatchPredictions = await listPredictionsByMatch(matchId)
      const alreadySubmittedFromIp = existingMatchPredictions.some((prediction) =>
        prediction.userId !== userId && prediction.sourceIpHash === sourceIpHash,
      )

      if (alreadySubmittedFromIp) {
        return NextResponse.json(
          { error: 'A prediction has already been submitted for this match from this connection.' },
          { status: 409 },
        )
      }
    }

    const prediction = await upsertPrediction({
      userId,
      displayName,
      sourceIpHash,
      matchId,
      type,
      outcome,
      homeScore,
      awayScore,
      pointsAwarded: existing?.pointsAwarded ?? 0,
    })

    const predictions = await listPublicPredictionsByMatch(matchId)
    const currentPrediction = predictions.find((entry) => entry.userId === userId) ?? null

    const response = NextResponse.json({
      prediction,
      predictionDistribution: buildDistributionFromPredictions(matchId, predictions),
      predictions,
      currentPredictorId: userId,
      currentPrediction,
    }, { status: 200 })

    if (!session && guestPredictor) {
      response.cookies.set({
        name: GUEST_PREDICTOR_COOKIE_NAME,
        value: guestPredictor.predictorId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: GUEST_PREDICTOR_COOKIE_TTL_SECONDS,
      })
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Unable to save prediction' }, { status: 500 })
  }
}
