export type PredictionType = 'outcome' | 'score'
export type MatchOutcome = 'home' | 'draw' | 'away'
export type UserThemePreference = 'light' | 'dark' | 'colorblind'
export type UserLocalePreference = 'en' | 'fr'

export interface UserPreferences {
  favoriteTeamIds: string[]
  themePreference: UserThemePreference
  locale: UserLocalePreference
}

export interface StoredUser {
  id: string
  username: string
  passwordHash: string
  createdAt: string
  preferences?: Partial<UserPreferences>
}

export interface AuthUser {
  id: string
  username: string
  preferences?: Partial<UserPreferences>
}

export interface PredictionRecord {
  userId: string
  displayName?: string
  sourceIpHash?: string
  matchId: string
  type: PredictionType
  outcome: MatchOutcome
  homeScore?: number
  awayScore?: number
  pointsAwarded: number
  createdAt: string
  updatedAt: string
  scoredAt?: string
}

export interface PredictionDistribution {
  matchId: string
  homeCount: number
  drawCount: number
  awayCount: number
  totalPredictions: number
}

export interface LeaderboardEntry {
  userId: string
  username: string
  points: number
  predictionsCount: number
}

export interface PublicProfile {
  username: string
  rank: number
  points: number
  predictionsCount: number
  predictions: PredictionRecord[]
}
