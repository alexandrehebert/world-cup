/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { useLocale } from '../../contexts/locale-context'
import { usePredictions } from '../../contexts/predictions-context'
import { useNow } from '../../contexts/time-context'
import { inferOutcomeFromScores } from '../../lib/predictions'
import type { MatchOutcome } from '../../types/predictions'

export type PredictionValidationIssue = 'outcome' | 'scores'

export interface PredictionErrorState {
  message: string
  matchId?: string
  issue?: PredictionValidationIssue
}

export interface PredictionDraftState {
  selectedOutcomes: Record<string, MatchOutcome>
  scoreInputs: Record<string, { home: string; away: string }>
  scoreFieldsVisibleByMatch: Record<string, boolean>
  dirtyMatches: Record<string, boolean>
  predictionError: PredictionErrorState | null
  setSelectedOutcomes: React.Dispatch<React.SetStateAction<Record<string, MatchOutcome>>>
  setScoreInputs: React.Dispatch<React.SetStateAction<Record<string, { home: string; away: string }>>>
  setScoreFieldsVisibleByMatch: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setDirtyMatches: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setPredictionError: React.Dispatch<React.SetStateAction<PredictionErrorState | null>>
  submitPrediction: (matchId: string, kickoffMs: number) => Promise<void>
}

export const usePredictionDrafts = (): PredictionDraftState => {
  const { t } = useLocale()
  const { predictionsByMatch, savePrediction } = usePredictions()
  const nowMs = useNow()

  const [selectedOutcomes, setSelectedOutcomes] = useState<Record<string, MatchOutcome>>({})
  const [scoreInputs, setScoreInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [scoreFieldsVisibleByMatch, setScoreFieldsVisibleByMatch] = useState<Record<string, boolean>>({})
  const [dirtyMatches, setDirtyMatches] = useState<Record<string, boolean>>({})
  const [predictionError, setPredictionError] = useState<PredictionErrorState | null>(null)

  useEffect(() => {
    setSelectedOutcomes(
      Object.fromEntries(
        Object.values(predictionsByMatch).map((p) => [p.matchId, p.outcome]),
      ),
    )
    setScoreInputs((current) => {
      const next = { ...current }
      for (const p of Object.values(predictionsByMatch)) {
        if (p.type === 'score') {
          next[p.matchId] = { home: String(p.homeScore ?? ''), away: String(p.awayScore ?? '') }
        }
      }
      return next
    })
    setScoreFieldsVisibleByMatch((current) => {
      const next = { ...current }
      for (const p of Object.values(predictionsByMatch)) {
        if (p.type === 'score') next[p.matchId] = true
      }
      return next
    })
    setDirtyMatches({})
  }, [predictionsByMatch])

  const submitPrediction = async (matchId: string, kickoffMs: number) => {
    if (kickoffMs <= nowMs) {
      setPredictionError({ message: t.labels.predictionClosedStarted, matchId })
      return
    }

    const values = scoreInputs[matchId] ?? { home: '', away: '' }
    const homeRaw = values.home.trim()
    const awayRaw = values.away.trim()
    const hasAnyScore = homeRaw.length > 0 || awayRaw.length > 0
    const normalizedHomeScore = homeRaw.length > 0 ? homeRaw : '0'
    const normalizedAwayScore = awayRaw.length > 0 ? awayRaw : '0'
    const inferredOutcome = hasAnyScore ? inferOutcomeFromScores(normalizedHomeScore, normalizedAwayScore) : null
    const outcome = inferredOutcome ?? selectedOutcomes[matchId]

    if (!outcome) {
      setPredictionError({ message: t.labels.pickWinnerOrDrawFirst, matchId, issue: 'outcome' })
      return
    }

    setPredictionError(null)

    try {
      const saved = await savePrediction({
        matchId,
        outcome,
        ...(hasAnyScore ? { homeScore: normalizedHomeScore, awayScore: normalizedAwayScore } : {}),
      })
      setSelectedOutcomes((current) => ({ ...current, [matchId]: saved.outcome }))
      setScoreInputs((current) => ({
        ...current,
        [matchId]: { home: String(saved.homeScore ?? ''), away: String(saved.awayScore ?? '') },
      }))
      setDirtyMatches((current) => ({ ...current, [matchId]: false }))
    } catch (error) {
      setPredictionError({
        message: error instanceof Error ? error.message : t.labels.unableToSavePrediction,
        matchId,
      })
    }
  }

  return {
    selectedOutcomes,
    scoreInputs,
    scoreFieldsVisibleByMatch,
    dirtyMatches,
    predictionError,
    setSelectedOutcomes,
    setScoreInputs,
    setScoreFieldsVisibleByMatch,
    setDirtyMatches,
    setPredictionError,
    submitPrediction,
  }
}
