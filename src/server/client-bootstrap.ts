import { cookies } from 'next/headers'
import { parseSessionToken, sessionCookieName } from './auth'
import {
  getUserById,
  listLeaderboard,
  listPredictionDistributions,
  listPredictionsByUser,
  listPublicPredictionsByMatch,
} from './kv-store'
import { loadTournamentData } from './tournament-data'
import type { ClientBootstrapData } from '../types/bootstrap'
import type { MatchOutcome, PredictionDistribution } from '../types/predictions'

const DEFAULT_LEADERBOARD_LIMIT = 100
const GUEST_PREDICTOR_COOKIE_NAME = 'wc_guest_predictor'
const GUEST_PREDICTOR_ID_REGEX = /^[a-z0-9_-]{16,64}$/

const buildDistributionFromPredictions = (
  matchId: string,
  predictions: Array<{ outcome: MatchOutcome }>,
): PredictionDistribution => {
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

export const loadClientBootstrapData = async (options?: { publicMatchId?: string }): Promise<ClientBootstrapData> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(sessionCookieName)?.value
  const session = parseSessionToken(token)
  const storedUser = session ? await getUserById(session.id).catch(() => null) : null

  const [initialPredictions, initialPredictionDistributions]: [
    ClientBootstrapData['initialPredictions'],
    ClientBootstrapData['initialPredictionDistributions'],
  ] = session
    ? await Promise.all([
        listPredictionsByUser(session.id).catch(() => []),
        loadTournamentData()
          .then((tournamentData) => {
            const openMatchIds = tournamentData.matches
              .filter((match) => match.status === 'scheduled' && new Date(match.kickoff).getTime() > Date.now())
              .map((match) => match.id)
            return listPredictionDistributions(openMatchIds)
          })
          .catch(() => []),
      ])
    : [[], []]
  const initialLeaderboard: ClientBootstrapData['initialLeaderboard'] = await listLeaderboard()
    .then((leaderboard) =>
      leaderboard.slice(0, DEFAULT_LEADERBOARD_LIMIT).map((entry, index) => ({
        rank: index + 1,
        ...entry,
      })),
    )
    .catch(() => [])
  const publicMatchId = options?.publicMatchId?.trim() ?? ''
  const currentPredictorId = session
    ? session.id
    : (() => {
        const guestPredictorId = cookieStore.get(GUEST_PREDICTOR_COOKIE_NAME)?.value?.trim() ?? ''
        return GUEST_PREDICTOR_ID_REGEX.test(guestPredictorId) ? `guest:${guestPredictorId}` : null
      })()
  const initialPublicMatchPrediction = publicMatchId
    ? await listPublicPredictionsByMatch(publicMatchId)
        .then((predictions) => {
          const currentPrediction = currentPredictorId
            ? predictions.find((prediction) => prediction.userId === currentPredictorId) ?? null
            : null
          return {
            matchId: publicMatchId,
            predictions,
            predictionDistribution: buildDistributionFromPredictions(publicMatchId, predictions),
            currentPredictorId,
            currentPrediction,
          }
        })
        .catch(() => null)
    : null

  return {
    sessionResolved: true,
    initialUser: storedUser
      ? {
          id: storedUser.id,
          username: storedUser.username,
          preferences: storedUser.preferences ?? {},
        }
      : session ?? null,
    initialPredictions,
    initialPredictionDistributions,
    initialLeaderboard,
    initialPublicMatchPrediction,
  }
}
