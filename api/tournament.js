import { loadTournamentData } from './_lib/tournament-data.js'

export default async function handler(_request, response) {
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
