import type { CompetitionProfile } from './types'

export const sixNationsChampionship2025Competition: CompetitionProfile = {
  id: 'six-nations-championship-2025',
  displayName: 'Six Nations Championship 2025',
  shortName: 'Six Nations 2025',
  sportLabel: 'rugby',
  ballIcon: 'rugby',
  localDataFile: '2025-rugby-six-nations-championship.json',
  blobDataFile: 'six-nations-championship-2025/tournament.json',
  defaultMongoDbName: 'six-nations-championship-2025',
  defaultMatchResultsUrl: 'https://api.wr-rims-prod.pulselive.com/rugby/v3/event/62bf5a1b-f6a7-452f-ae17-5a378e77917e/schedule',
  guestPredictorCookieName: 'six_nations_championship_guest_predictor',
}
