import type { CompetitionProfile } from './types'

export const worldCup2026Competition: CompetitionProfile = {
  id: 'world-cup-2026',
  displayName: 'FIFA World Cup 2026',
  shortName: 'World Cup 2026',
  sportLabel: 'football',
  ballIcon: 'soccer',
  localDataFile: 'worldcup.json',
  blobDataFile: 'worldcup/worldcup.json',
  defaultMongoDbName: 'world-cup',
  defaultMatchResultsUrl: 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
  guestPredictorCookieName: 'wc_guest_predictor',
  siteDisplayHost: 'world-cup.hebert.app',
}
