import { cookies, headers } from 'next/headers'
import { getActiveCompetitionProfile } from '../competitions'
import { parseSessionToken, sessionCookieName } from './auth'
import {
  getUserById,
  listLeaderboard,
  listPredictionDistributions,
  listPredictionsByUser,
  listPublicPredictionsByMatch,
  normalizeUsername,
} from './kv-store'
import { loadTournamentData } from './tournament-data'
import {
  LOCALE_COOKIE_NAME,
  THEME_PREFERENCE_COOKIE_NAME,
  TIME_ZONE_COOKIE_NAME,
  isLocaleCode,
  isThemePreference,
  isValidTimeZone,
} from '../lib/user-preferences'
import { isAccountFeatureEnabled, isPredictionsFeatureEnabled } from '../lib/features'
import type { ClientBootstrapData } from '../types/bootstrap'
import type { MatchOutcome, PredictionDistribution } from '../types/predictions'

const DEFAULT_LEADERBOARD_LIMIT = 100
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
  const nowMs = Date.now()
  const cookieStore = await cookies()
  const headerStore = await headers()
  const token = isAccountFeatureEnabled ? cookieStore.get(sessionCookieName)?.value : undefined
  const session = isAccountFeatureEnabled ? parseSessionToken(token) : null
  const storedUser = isAccountFeatureEnabled && session ? await getUserById(session.id).catch(() => null) : null
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value
  const cookieThemePreference = cookieStore.get(THEME_PREFERENCE_COOKIE_NAME)?.value
  const cookieTimeZone = cookieStore.get(TIME_ZONE_COOKIE_NAME)?.value
  const preferredLocale = storedUser?.preferences?.locale
  const preferredThemePreference = storedUser?.preferences?.themePreference
  const acceptLanguageHeader = headerStore.get('accept-language') ?? ''
  const headerLocale = acceptLanguageHeader.toLowerCase().startsWith('fr') ? 'fr' : 'en'
  const initialLocale = isLocaleCode(preferredLocale)
    ? preferredLocale
    : isLocaleCode(cookieLocale)
      ? cookieLocale
      : headerLocale
  const initialThemePreference = isThemePreference(preferredThemePreference)
    ? preferredThemePreference
    : isThemePreference(cookieThemePreference)
      ? cookieThemePreference
      : null
  const initialTimeZone = isValidTimeZone(cookieTimeZone) ? cookieTimeZone : 'UTC'

  const [initialPredictions, initialPredictionDistributions]: [
    ClientBootstrapData['initialPredictions'],
    ClientBootstrapData['initialPredictionDistributions'],
  ] = isPredictionsFeatureEnabled
    ? session
      ? await Promise.all([
          listPredictionsByUser(session.id).catch(() => []),
          loadTournamentData()
            .then((tournamentData) => {
              const openMatchIds = tournamentData.matches
                .filter((match) => match.status === 'scheduled' && new Date(match.kickoff).getTime() > nowMs)
                .map((match) => match.id)
              return listPredictionDistributions(openMatchIds)
            })
            .catch(() => []),
        ])
      : [[], []]
    : [[], []]
  const initialLeaderboard: ClientBootstrapData['initialLeaderboard'] = isPredictionsFeatureEnabled
    ? await listLeaderboard()
      .then((leaderboard) =>
        leaderboard.slice(0, DEFAULT_LEADERBOARD_LIMIT).map((entry, index) => ({
          rank: index + 1,
          ...entry,
        })),
      )
      .catch(() => [])
    : []
  const publicMatchId = options?.publicMatchId?.trim() ?? ''
  const currentPredictorId = session
    ? session.id
    : (() => {
        const guestPredictorId = cookieStore.get(guestPredictorCookieName)?.value?.trim() ?? ''
        return GUEST_PREDICTOR_ID_REGEX.test(guestPredictorId) ? `guest:${guestPredictorId}` : null
      })()
  const initialPublicMatchPrediction = isPredictionsFeatureEnabled && publicMatchId
    ? await listPublicPredictionsByMatch(publicMatchId)
        .then((predictions) => {
          const byPredictorId = currentPredictorId
            ? predictions.find((prediction) => prediction.userId === currentPredictorId) ?? null
            : null
          const currentPrediction = byPredictorId
            ?? (session
              ? predictions.find((prediction) => normalizeUsername(prediction.displayName) === normalizeUsername(session.username)) ?? null
              : null)
          return {
            matchId: publicMatchId,
            predictions,
            predictionDistribution: buildDistributionFromPredictions(publicMatchId, predictions),
            currentPredictorId: currentPrediction?.userId ?? currentPredictorId,
            currentPrediction,
          }
        })
        .catch(() => null)
    : null

  return {
    sessionResolved: true,
    initialUser: isAccountFeatureEnabled
      ? storedUser
        ? {
            id: storedUser.id,
            username: storedUser.username,
            preferences: storedUser.preferences ?? {},
          }
        : session ?? null
      : null,
    initialLocale,
    initialThemePreference,
    initialNowMs: nowMs,
    initialTimeZone,
    initialPredictions,
    initialPredictionDistributions,
    initialLeaderboard,
    initialPublicMatchPrediction,
  }
}
  const guestPredictorCookieName = getActiveCompetitionProfile().guestPredictorCookieName
