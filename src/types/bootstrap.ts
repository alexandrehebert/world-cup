import type { AuthUser, LeaderboardEntry, PredictionDistribution, PredictionRecord, UserThemePreference } from './predictions'
import type { LocaleCode } from './tournament'

export type RankedLeaderboardEntry = LeaderboardEntry & { rank: number }
export type PublicPredictionRecord = PredictionRecord & { displayName: string }

export interface PublicMatchPredictionBootstrapData {
  matchId: string
  predictions: PublicPredictionRecord[]
  predictionDistribution: PredictionDistribution
  currentPredictorId: string | null
  currentPrediction: PublicPredictionRecord | null
}

export interface ClientBootstrapData {
  sessionResolved: boolean
  initialUser: AuthUser | null
  initialLocale: LocaleCode
  initialThemePreference: UserThemePreference | null
  initialNowMs: number
  initialTimeZone: string
  initialPredictions: PredictionRecord[]
  initialPredictionDistributions: PredictionDistribution[]
  initialLeaderboard: RankedLeaderboardEntry[]
  initialPublicMatchPrediction: PublicMatchPredictionBootstrapData | null
}
