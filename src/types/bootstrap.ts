import type { AuthUser, LeaderboardEntry, PredictionDistribution, PredictionRecord } from './predictions'

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
  initialPredictions: PredictionRecord[]
  initialPredictionDistributions: PredictionDistribution[]
  initialLeaderboard: RankedLeaderboardEntry[]
  initialPublicMatchPrediction: PublicMatchPredictionBootstrapData | null
}
