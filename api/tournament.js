import { loadTournamentData } from './_lib/tournament-data.js'

export default async function handler(_request, response) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0')
  response.setHeader('Pragma', 'no-cache')
  response.setHeader('Expires', '0')

  try {
    const data = await loadTournamentData()
    return response.status(200).json(data)
  } catch (error) {
    return response.status(500).json({
      error: 'Unable to load tournament data',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
