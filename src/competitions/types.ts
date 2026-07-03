export type CompetitionId =
  | 'world-cup-2026'
  | 'nations-championship-2026'
  | 'six-nations-championship-2025'
  | 'six-nations-championship-2026'

export type CompetitionProfile = {
  id: CompetitionId
  displayName: string
  shortName: string
  sportLabel: string
  ballIcon: 'soccer' | 'rugby'
  localDataFile: string
  blobDataFile: string
  defaultMongoDbName: string
  defaultMatchResultsUrl?: string
  guestPredictorCookieName: string
  siteDisplayHost?: string
}
