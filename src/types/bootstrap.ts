import type { AuthUser, LeaderboardEntry, PredictionDistribution, PredictionRecord } from './predictions'

export type RankedLeaderboardEntry = LeaderboardEntry & { rank: number }

export interface ClientBootstrapData {
  sessionResolved: boolean
  initialUser: AuthUser | null
  initialPredictions: PredictionRecord[]
  initialPredictionDistributions: PredictionDistribution[]
  initialLeaderboard: RankedLeaderboardEntry[]
}
