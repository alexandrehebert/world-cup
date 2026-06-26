/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MatchOutcome, PredictionDistribution, PredictionRecord } from '../types/predictions'

type PredictionsResponse = {
  predictions: PredictionRecord[]
  predictionDistributions: PredictionDistribution[]
}

type SavePredictionInput = {
  matchId: string
  outcome: MatchOutcome
  homeScore?: string | number
  awayScore?: string | number
}

interface PredictionsContextValue {
  predictionsByMatch: Record<string, PredictionRecord>
  predictionDistributionsByMatch: Record<string, PredictionDistribution>
  isLoading: boolean
  savingMatchId: string | null
  refreshPredictions: (options?: { showLoading?: boolean }) => Promise<void>
  savePrediction: (input: SavePredictionInput) => Promise<PredictionRecord>
}

const PredictionsContext = createContext<PredictionsContextValue | undefined>(undefined)

const toDistributionMap = (entries: PredictionDistribution[]) =>
  Object.fromEntries(entries.map((entry) => [entry.matchId, entry]))

const readApiError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string }
    return payload.error ?? 'Request failed'
  } catch {
    return 'Request failed'
  }
}

export const PredictionsProvider = ({
  children,
  initialPredictions,
  initialPredictionDistributions,
}: {
  children: ReactNode
  initialPredictions?: PredictionRecord[]
  initialPredictionDistributions?: PredictionDistribution[]
}) => {
  const hasInitialPredictions = initialPredictions !== undefined
  const [predictionsByMatch, setPredictionsByMatch] = useState<Record<string, PredictionRecord>>(() =>
    Object.fromEntries((initialPredictions ?? []).map((prediction) => [prediction.matchId, prediction])),
  )
  const [predictionDistributionsByMatch, setPredictionDistributionsByMatch] = useState<
    Record<string, PredictionDistribution>
  >(() => toDistributionMap(initialPredictionDistributions ?? []))
  const [isLoading, setIsLoading] = useState(false)
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null)

  const refreshPredictions = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true
    if (showLoading) {
      setIsLoading(true)
    }

    try {
      const response = await fetch('/api/predictions', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const payload = (await response.json()) as PredictionsResponse
      setPredictionsByMatch(
        Object.fromEntries(payload.predictions.map((prediction) => [prediction.matchId, prediction])),
      )
      setPredictionDistributionsByMatch(toDistributionMap(payload.predictionDistributions))
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const shouldShowLoading = !hasInitialPredictions
    void refreshPredictions({ showLoading: shouldShowLoading })
  }, [hasInitialPredictions, refreshPredictions])

  const savePrediction = useCallback(async ({ matchId, outcome, homeScore, awayScore }: SavePredictionInput) => {
    const hasHomeScore = homeScore !== undefined && String(homeScore).trim().length > 0
    const hasAwayScore = awayScore !== undefined && String(awayScore).trim().length > 0

    if ((hasHomeScore && !hasAwayScore) || (!hasHomeScore && hasAwayScore)) {
      throw new Error('Both scores are required for a score prediction.')
    }

    setSavingMatchId(matchId)

    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          matchId,
          type: hasHomeScore && hasAwayScore ? 'score' : 'outcome',
          outcome,
          ...(hasHomeScore && hasAwayScore ? { homeScore, awayScore } : {}),
        }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const payload = (await response.json()) as {
        prediction: PredictionRecord
        predictionDistribution?: PredictionDistribution
      }

      setPredictionsByMatch((current) => ({
        ...current,
        [matchId]: payload.prediction,
      }))
      const predictionDistribution = payload.predictionDistribution

      if (predictionDistribution) {
        setPredictionDistributionsByMatch((current) => ({
          ...current,
          [matchId]: predictionDistribution,
        }))
      }

      return payload.prediction
    } finally {
      setSavingMatchId(null)
    }
  }, [])

  const value = useMemo<PredictionsContextValue>(
    () => ({
      predictionsByMatch,
      predictionDistributionsByMatch,
      isLoading,
      savingMatchId,
      refreshPredictions,
      savePrediction,
    }),
    [
      predictionsByMatch,
      predictionDistributionsByMatch,
      isLoading,
      savingMatchId,
      refreshPredictions,
      savePrediction,
    ],
  )

  return <PredictionsContext.Provider value={value}>{children}</PredictionsContext.Provider>
}

export const usePredictions = () => {
  const context = useContext(PredictionsContext)

  if (!context) {
    throw new Error('usePredictions must be used within PredictionsProvider')
  }

  return context
}
