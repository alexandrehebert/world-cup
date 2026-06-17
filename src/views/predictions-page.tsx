/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { useLocale } from '../contexts/locale-context'
import { usePredictions } from '../contexts/predictions-context'
import { useNow } from '../contexts/time-context'
import { useTournament } from '../contexts/tournament-context'
import { formatMatchDate } from '../lib/format'
import { Icon } from '../lib/icons'
import { FeedbackPopup } from '../components/ui/feedback-popup'
import type { MatchOutcome, PredictionRecord } from '../types/predictions'

type PredictionValidationIssue = 'outcome' | 'scores'
type PredictionErrorState = {
  message: string
  matchId?: string
  issue?: PredictionValidationIssue
}

const inferOutcomeFromScores = (homeRaw: string, awayRaw: string): MatchOutcome | null => {
  const homeValue = homeRaw.trim()
  const awayValue = awayRaw.trim()

  if (!homeValue || !awayValue) {
    return null
  }

  const homeScore = Number(homeValue)
  const awayScore = Number(awayValue)
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
    return null
  }

  if (homeScore > awayScore) {
    return 'home'
  }

  if (awayScore > homeScore) {
    return 'away'
  }

  return 'draw'
}

export const PredictionsPage = () => {
  const { locale, t } = useLocale()
  const { user, isLoading, openAuthModal } = useAuth()
  const {
    predictionsByMatch,
    predictionDistributionsByMatch,
    isLoading: isPredictionsLoading,
    savePrediction,
    savingMatchId,
  } = usePredictions()
  const { upcomingMatches, teamsById } = useTournament()
  const nowMs = useNow()
  const [selectedOutcomes, setSelectedOutcomes] = useState<Record<string, MatchOutcome>>({})
  const [predictionError, setPredictionError] = useState<PredictionErrorState | null>(null)
  const [scoreInputs, setScoreInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [scoreFieldsVisibleByMatch, setScoreFieldsVisibleByMatch] = useState<Record<string, boolean>>({})
  const [dirtyMatches, setDirtyMatches] = useState<Record<string, boolean>>({})
  const drawLabel = t.labels.draw

  const predictionOpenMatches = useMemo(() => {
    return upcomingMatches
      .filter((match) => {
        const hasKnownTeams =
          Boolean(match.home.teamId) &&
          Boolean(match.away.teamId) &&
          Boolean(match.home.teamId ? teamsById[match.home.teamId] : undefined) &&
          Boolean(match.away.teamId ? teamsById[match.away.teamId] : undefined)

        return match.status === 'scheduled' && new Date(match.kickoff).getTime() > nowMs && hasKnownTeams
      })
      .sort((first, second) => first.kickoff.localeCompare(second.kickoff))
  }, [upcomingMatches, nowMs, teamsById])

  useEffect(() => {
    setSelectedOutcomes(
      Object.fromEntries(
        Object.values(predictionsByMatch).map((prediction) => [prediction.matchId, prediction.outcome]),
      ),
    )
    setScoreInputs((current) => {
      const next = { ...current }

      for (const prediction of Object.values(predictionsByMatch)) {
        if (prediction.type === 'score') {
          next[prediction.matchId] = {
            home: String(prediction.homeScore ?? ''),
            away: String(prediction.awayScore ?? ''),
          }
        }
      }

      return next
    })
    setScoreFieldsVisibleByMatch((current) => {
      const next = { ...current }

      for (const prediction of Object.values(predictionsByMatch)) {
        if (prediction.type === 'score') {
          next[prediction.matchId] = true
        }
      }

      return next
    })
    setDirtyMatches({})
  }, [predictionsByMatch])

  const submitPrediction = async (matchId: string, kickoffMs: number) => {
    if (kickoffMs <= nowMs) {
      setPredictionError(
        {
          message:
            t.labels.predictionClosedStarted,
          matchId,
        },
      )
      return
    }

    const values = scoreInputs[matchId] ?? { home: '', away: '' }
    const hasHomeScore = values.home.trim().length > 0
    const hasAwayScore = values.away.trim().length > 0
    const inferredOutcome = hasHomeScore && hasAwayScore ? inferOutcomeFromScores(values.home, values.away) : null
    const outcome = inferredOutcome ?? selectedOutcomes[matchId]

    if (!outcome) {
      setPredictionError({
        message: t.labels.pickWinnerOrDrawFirst,
        matchId,
        issue: 'outcome',
      })
      return
    }

    if ((hasHomeScore && !hasAwayScore) || (!hasHomeScore && hasAwayScore)) {
      setPredictionError({
        message: t.labels.enterBothScoresOrLeaveEmpty,
        matchId,
        issue: 'scores',
      })
      return
    }

    const isScorePrediction = hasHomeScore && hasAwayScore
    setPredictionError(null)

    try {
      const savedPrediction = await savePrediction({
        matchId,
        outcome,
        ...(isScorePrediction ? { homeScore: values.home, awayScore: values.away } : {}),
      })
      setSelectedOutcomes((current) => ({ ...current, [matchId]: savedPrediction.outcome }))
      setScoreInputs((current) => ({
        ...current,
        [matchId]: {
          home: String(savedPrediction.homeScore ?? ''),
          away: String(savedPrediction.awayScore ?? ''),
        },
      }))
      setDirtyMatches((current) => ({ ...current, [matchId]: false }))
    } catch (error) {
      setPredictionError({
        message: error instanceof Error ? error.message : t.labels.unableToSavePrediction,
        matchId,
      })
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.predictions}</h2>
      </div>

      {isLoading ? (
        <div className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
          {t.labels.loadingSession}
        </div>
      ) : !user ? (
        <div className="space-y-4 bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--text-muted)]">
            {t.labels.signInToAccessPredictions}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="cursor-pointer bg-[var(--accent-muted)] px-3 py-2 text-sm font-semibold text-[var(--accent-text)] transition hover:brightness-105"
            >
              {t.labels.signIn}
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="cursor-pointer bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
            >
              {t.labels.createAccount}
            </button>
          </div>
        </div>
      ) : null}

      <FeedbackPopup
        message={predictionError?.message ?? null}
        onDismiss={() => setPredictionError(null)}
        dismissLabel={t.labels.close}
      />

      {user && !isPredictionsLoading && predictionOpenMatches.length === 0 ? (
        <div className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">{t.labels.noPredictionMatches}</div>
      ) : null}

      {user && !isPredictionsLoading ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {predictionOpenMatches.map((match) => {
            const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
            const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
            const homeLabel = homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : t.labels.tbd
            const awayLabel = awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : t.labels.tbd
            const prediction: PredictionRecord | undefined = predictionsByMatch[match.id]
            const predictionDistribution = predictionDistributionsByMatch[match.id] ?? {
              matchId: match.id,
              homeCount: 0,
              drawCount: 0,
              awayCount: 0,
              totalPredictions: 0,
            }
            const totalPredictions = predictionDistribution.totalPredictions
            const homeShare = totalPredictions > 0 ? predictionDistribution.homeCount / totalPredictions : 0
            const drawShare = totalPredictions > 0 ? predictionDistribution.drawCount / totalPredictions : 0
            const awayShare = totalPredictions > 0 ? predictionDistribution.awayCount / totalPredictions : 0
            const maxShare = Math.max(homeShare, drawShare, awayShare)
            const dominantOutcome =
              maxShare === 0 ? 'neutral' : homeShare === maxShare ? 'home' : drawShare === maxShare ? 'draw' : 'away'
            const heatColorByOutcome = {
              home: 'rgb(52 211 153)',
              draw: 'rgb(168 162 158)',
              away: 'rgb(56 189 248)',
              neutral: 'rgb(161 161 170)',
            } as const
            const heatOpacity = totalPredictions > 0 ? 0.25 + maxShare * 0.55 : 0.2
            const trendPositionPercent = Math.round((homeShare * 0 + drawShare * 50 + awayShare * 100) * 10) / 10
            const trendTooltip = `${homeLabel}: ${Math.round(homeShare * 100)}% • ${drawLabel}: ${Math.round(drawShare * 100)}% • ${awayLabel}: ${Math.round(awayShare * 100)}%`
            const { localDateTime } = formatMatchDate(match.kickoff, locale, Intl.DateTimeFormat().resolvedOptions().timeZone, t.labels.today)
            const isSaving = savingMatchId === match.id
            const isPredictionClosed = new Date(match.kickoff).getTime() <= nowMs
            const persistedOutcome = prediction?.outcome
            const persistedHomeScore = prediction?.type === 'score' && prediction.homeScore !== undefined ? String(prediction.homeScore) : ''
            const persistedAwayScore = prediction?.type === 'score' && prediction.awayScore !== undefined ? String(prediction.awayScore) : ''
            const selectedOutcome = selectedOutcomes[match.id] ?? persistedOutcome
            const scoreInput = scoreInputs[match.id] ?? { home: persistedHomeScore, away: persistedAwayScore }
            const draftHomeScore = scoreInput.home.trim()
            const draftAwayScore = scoreInput.away.trim()
            const hasPersistedScores = persistedHomeScore.length > 0 || persistedAwayScore.length > 0
            const hasDraftScores = draftHomeScore.length > 0 || draftAwayScore.length > 0
            const isScoreFieldsVisible = scoreFieldsVisibleByMatch[match.id] ?? (hasPersistedScores || hasDraftScores)
            const activeValidationIssue = predictionError?.matchId === match.id ? predictionError.issue : undefined
            const isOutcomeInvalid = activeValidationIssue === 'outcome' && !selectedOutcome
            const isScoresInvalid = activeValidationIssue === 'scores'
            const isHomeScoreInvalid = isScoresInvalid && draftHomeScore.length === 0 && draftAwayScore.length > 0
            const isAwayScoreInvalid = isScoresInvalid && draftAwayScore.length === 0 && draftHomeScore.length > 0
            const isDraftDirty = Boolean(dirtyMatches[match.id])
            const hasChanges =
              isDraftDirty &&
              ((selectedOutcome ?? null) !== (persistedOutcome ?? null) ||
                draftHomeScore !== persistedHomeScore ||
                draftAwayScore !== persistedAwayScore)
            const predictionStatus = !prediction
              ? null
              : prediction.scoredAt
                ? prediction.pointsAwarded > 0
                  ? 'successful'
                  : 'unsuccessful'
                : 'pending'

            const statusIconByState = {
              successful: 'check_circle',
              pending: 'schedule',
              unsuccessful: 'cancel',
            } as const

            const statusClassByState = {
              successful: 'bg-[var(--accent-muted)] text-[var(--accent-text)]',
              pending: 'bg-[var(--surface-soft)] text-[var(--text-muted)]',
              unsuccessful: 'bg-[var(--surface-soft)] text-rose-400',
            } as const

            const statusTitleByState = {
              successful: t.labels.predictionSuccessful,
              pending: t.labels.predictionPending,
              unsuccessful: t.labels.predictionUnsuccessful,
            } as const
            return (
              <article key={match.id} className="space-y-3 bg-[var(--surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--text-strong)]">
                      {homeLabel} vs {awayLabel}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{localDateTime}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {predictionStatus && !hasChanges ? (
                      <span
                        title={statusTitleByState[predictionStatus]}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${statusClassByState[predictionStatus]}`}
                      >
                        <Icon name={statusIconByState[predictionStatus]} className="text-sm leading-none" />
                      </span>
                    ) : null}
                    {hasChanges ? (
                      <>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => {
                            setPredictionError(null)
                            setSelectedOutcomes((current) => {
                              const next = { ...current }
                              if (persistedOutcome) {
                                next[match.id] = persistedOutcome
                              } else {
                                delete next[match.id]
                              }
                              return next
                            })
                            setScoreInputs((current) => ({
                              ...current,
                              [match.id]: { home: persistedHomeScore, away: persistedAwayScore },
                            }))
                            setDirtyMatches((current) => ({ ...current, [match.id]: false }))
                          }}
                          className="cursor-pointer border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t.labels.cancel}
                        </button>
                        <button
                          type="button"
                          disabled={isSaving || isPredictionClosed}
                          onClick={() => {
                            void submitPrediction(match.id, new Date(match.kickoff).getTime())
                          }}
                          className="cursor-pointer bg-[var(--accent-muted)] px-3 py-1 text-sm font-semibold text-[var(--accent-text)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t.labels.save}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-3 items-start gap-2">
                    {(
                      [
                        { value: 'home' as const, label: homeLabel },
                        { value: 'draw' as const, label: drawLabel },
                        { value: 'away' as const, label: awayLabel },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                          if (predictionError?.matchId === match.id) {
                            setPredictionError(null)
                          }
                          if (selectedOutcome === item.value) {
                            return
                          }
                          setSelectedOutcomes((current) => ({ ...current, [match.id]: item.value }))
                          setScoreInputs((current) => ({
                            ...current,
                            [match.id]: { home: '', away: '' },
                          }))
                          setDirtyMatches((current) => ({ ...current, [match.id]: true }))
                        }}
                        className={`w-full cursor-pointer px-2 py-2 text-xs font-semibold transition hover:brightness-105 sm:text-sm ${
                          selectedOutcome === item.value
                            ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]'
                            : 'bg-[var(--surface-soft)] text-[var(--text)]'
                        } ${isOutcomeInvalid ? 'ring-1 ring-rose-400' : ''} disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid h-9 grid-cols-3 items-center gap-2">
                    {isScoreFieldsVisible ? (
                      <>
                        <input
                        type="number"
                        min={0}
                        value={scoreInput.home}
                        onChange={(event) => {
                          if (predictionError?.matchId === match.id) {
                            setPredictionError(null)
                          }
                          const nextScoreInput = { ...scoreInput, home: event.target.value }
                          const inferredOutcome = inferOutcomeFromScores(nextScoreInput.home, nextScoreInput.away)
                          setScoreInputs((current) => ({
                            ...current,
                            [match.id]: nextScoreInput,
                          }))
                          setDirtyMatches((current) => ({ ...current, [match.id]: true }))
                          if (inferredOutcome) {
                            setSelectedOutcomes((current) => ({ ...current, [match.id]: inferredOutcome }))
                          }
                        }}
                        placeholder={homeTeam?.code ?? t.labels.home}
                        className={`h-full w-full border bg-[var(--surface-strong)] px-2 py-1 text-center text-sm ${
                          isHomeScoreInvalid ? 'border-rose-400 ring-1 ring-rose-400' : 'border-[var(--border)]'
                        }`}
                      />
                        <span className="self-center text-center text-sm text-[var(--text-muted)]">-</span>
                        <input
                        type="number"
                        min={0}
                        value={scoreInput.away}
                        onChange={(event) => {
                          if (predictionError?.matchId === match.id) {
                            setPredictionError(null)
                          }
                          const nextScoreInput = { ...scoreInput, away: event.target.value }
                          const inferredOutcome = inferOutcomeFromScores(nextScoreInput.home, nextScoreInput.away)
                          setScoreInputs((current) => ({
                            ...current,
                            [match.id]: nextScoreInput,
                          }))
                          setDirtyMatches((current) => ({ ...current, [match.id]: true }))
                          if (inferredOutcome) {
                            setSelectedOutcomes((current) => ({ ...current, [match.id]: inferredOutcome }))
                          }
                        }}
                        placeholder={awayTeam?.code ?? t.labels.away}
                        className={`h-full w-full border bg-[var(--surface-strong)] px-2 py-1 text-center text-sm ${
                          isAwayScoreInvalid ? 'border-rose-400 ring-1 ring-rose-400' : 'border-[var(--border)]'
                        }`}
                      />
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                          setScoreFieldsVisibleByMatch((current) => ({ ...current, [match.id]: true }))
                        }}
                        className="col-span-3 cursor-pointer justify-self-center bg-transparent p-0 text-xs font-medium text-[var(--text-muted)] underline decoration-1 underline-offset-2 transition hover:text-[var(--text-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t.labels.predictScores}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>{t.labels.predictionTrend}</span>
                    <span>
                      {totalPredictions} {t.labels.players}
                    </span>
                  </div>
                  <div title={trendTooltip} className="relative h-2 overflow-hidden rounded bg-[var(--surface-soft)]">
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--text-muted)]/40"
                    />
                    {totalPredictions > 0 ? (
                      <>
                        <span
                          aria-hidden
                          className="absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[10px]"
                          style={{
                            left: `${trendPositionPercent}%`,
                            backgroundColor: heatColorByOutcome[dominantOutcome],
                            opacity: heatOpacity,
                          }}
                        />
                        <span
                          aria-hidden
                          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--surface)]"
                          style={{
                            left: `${trendPositionPercent}%`,
                            backgroundColor: heatColorByOutcome[dominantOutcome],
                          }}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
