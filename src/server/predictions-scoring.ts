import type { MatchRecord, TournamentData } from '../types/tournament'
import type { MatchOutcome, PredictionRecord } from '../types/predictions'
import { listPredictionsByMatch, setPredictionPoints } from './kv-store'

const OUTCOME_POINTS = 2
const SCORE_OUTCOME_POINTS = 3
const EXACT_SCORE_POINTS = 5

const getMatchOutcome = (homeScore: number, awayScore: number, homePenaltyScore?: number, awayPenaltyScore?: number): MatchOutcome => {
  if (homeScore > awayScore) {
    return 'home'
  }

  if (homeScore < awayScore) {
    return 'away'
  }

  // Tied — check penalty shootout
  if (homePenaltyScore !== undefined && awayPenaltyScore !== undefined) {
    if (homePenaltyScore > awayPenaltyScore) return 'home'
    if (awayPenaltyScore > homePenaltyScore) return 'away'
  }

  return 'draw'
}

const computePointsForPrediction = (prediction: PredictionRecord, homeScore: number, awayScore: number, homePenaltyScore?: number, awayPenaltyScore?: number) => {
  const outcome = getMatchOutcome(homeScore, awayScore, homePenaltyScore, awayPenaltyScore)

  if (prediction.type === 'score') {
    if (prediction.homeScore === homeScore && prediction.awayScore === awayScore) {
      return EXACT_SCORE_POINTS
    }

    return prediction.outcome === outcome ? SCORE_OUTCOME_POINTS : 0
  }

  return prediction.outcome === outcome ? OUTCOME_POINTS : 0
}

const hasFinalScore = (match: MatchRecord) => {
  return typeof match.home.score === 'number' && typeof match.away.score === 'number'
}

export const scoreFinishedMatches = async (data: TournamentData) => {
  const finishedMatches = data.matches.filter((match) => match.status === 'finished' && hasFinalScore(match))

  for (const match of finishedMatches) {
    const predictions = await listPredictionsByMatch(match.id)
    const homeScore = match.home.score as number
    const awayScore = match.away.score as number
    const homePenaltyScore = typeof match.home.penaltyScore === 'number' ? match.home.penaltyScore : undefined
    const awayPenaltyScore = typeof match.away.penaltyScore === 'number' ? match.away.penaltyScore : undefined

    await Promise.all(
      predictions.map((prediction) =>
        setPredictionPoints(
          prediction.userId,
          match.id,
          computePointsForPrediction(prediction, homeScore, awayScore, homePenaltyScore, awayPenaltyScore),
        ),
      ),
    )
  }
}
