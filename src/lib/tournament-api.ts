export const LIVE_TOURNAMENT_ENDPOINT = 'https://world-cup.hebert.app/api/tournament'

export const getTournamentApiBaseUrl = () => {
  return '/api/tournament'
}

export const getTournamentApiRequestUrl = () => `${getTournamentApiBaseUrl()}?ts=${Date.now()}`
