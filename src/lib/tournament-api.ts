import { getActiveCompetitionProfile } from '../competitions'
import type { CompetitionId } from '../competitions/types'

const competition = getActiveCompetitionProfile()

export const LIVE_TOURNAMENT_ENDPOINT = competition.siteDisplayHost ? `https://${competition.siteDisplayHost}/api/tournament` : '/api/tournament'

export const getTournamentApiBaseUrl = () => {
  return '/api/tournament'
}

export const getTournamentApiRequestUrl = (competitionId?: CompetitionId) => {
  const queryParams = new URLSearchParams({
    ts: String(Date.now()),
  })

  if (competitionId) {
    queryParams.set('competitionId', competitionId)
  }

  return `${getTournamentApiBaseUrl()}?${queryParams.toString()}`
}
