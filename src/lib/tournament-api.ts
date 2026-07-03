import { getActiveCompetitionProfile } from '../competitions'

const competition = getActiveCompetitionProfile()

export const LIVE_TOURNAMENT_ENDPOINT = competition.siteDisplayHost ? `https://${competition.siteDisplayHost}/api/tournament` : '/api/tournament'

export const getTournamentApiBaseUrl = () => {
  return '/api/tournament'
}

export const getTournamentApiRequestUrl = () => `${getTournamentApiBaseUrl()}?ts=${Date.now()}`
