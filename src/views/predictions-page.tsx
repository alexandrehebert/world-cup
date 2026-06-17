/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { useLocale } from '../contexts/locale-context'
import { usePredictions } from '../contexts/predictions-context'
import { useNow } from '../contexts/time-context'
import { useTournament } from '../contexts/tournament-context'
import { formatMatchDate } from '../lib/format'
import { Icon } from '../lib/icons'
import type { MatchOutcome, PredictionRecord } from '../types/predictions'

const drawLabelByLocale = (locale: 'en' | 'fr') => (locale === 'fr' ? 'Nul' : 'Draw')
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
  const [predictionError, setPredictionError] = useState<string | null>(null)
  const [scoreInputs, setScoreInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [dirtyMatches, setDirtyMatches] = useState<Record<string, boolean>>({})
  const drawLabel = drawLabelByLocale(locale)

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
    setDirtyMatches({})
  }, [predictionsByMatch])

  const submitPrediction = async (matchId: string, kickoffMs: number) => {
    if (kickoffMs <= nowMs) {
      setPredictionError(
        locale === 'fr'
          ? 'Ce match a commencé. Les pronostics sont fermés.'
          : 'This match has started. Predictions are closed.',
      )
      return
    }

    const values = scoreInputs[matchId] ?? { home: '', away: '' }
    const hasHomeScore = values.home.trim().length > 0
    const hasAwayScore = values.away.trim().length > 0
    const inferredOutcome = hasHomeScore && hasAwayScore ? inferOutcomeFromScores(values.home, values.away) : null
    const outcome = inferredOutcome ?? selectedOutcomes[matchId]

    if (!outcome) {
      setPredictionError(locale === 'fr' ? 'Choisis un gagnant ou nul.' : 'Pick a winner or draw first.')
      return
    }

    if ((hasHomeScore && !hasAwayScore) || (!hasHomeScore && hasAwayScore)) {
      setPredictionError(locale === 'fr' ? 'Entre les deux scores, ou laisse vide.' : 'Enter both scores, or leave both empty.')
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
      setPredictionError(error instanceof Error ? error.message : 'Unable to save prediction')
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.predictions}</h2>
      </div>

      {isLoading ? (
        <div className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
          {locale === 'fr' ? 'Chargement de la session...' : 'Loading session...'}
        </div>
      ) : !user ? (
        <div className="space-y-4 bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--text-muted)]">
            {locale === 'fr'
              ? 'Connecte-toi ou crée un compte pour accéder aux pronostics.'
              : 'Sign in or create an account to access predictions.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="bg-[var(--accent-muted)] px-3 py-2 text-sm font-semibold text-[var(--accent-text)]"
            >
              {t.labels.signIn}
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--text)]"
            >
              {t.labels.createAccount}
            </button>
          </div>
        </div>
      ) : null}

      {predictionError ? <p className="text-sm text-rose-400">{predictionError}</p> : null}

      {user && !isPredictionsLoading && predictionOpenMatches.length === 0 ? (
        <div className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">{t.labels.noPredictionMatches}</div>
      ) : null}

      {user && !isPredictionsLoading ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {predictionOpenMatches.map((match) => {
            const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
            const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
            const homeLabel = homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : 'TBD'
            const awayLabel = awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : 'TBD'
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
            const trendTooltip =
              locale === 'fr'
                ? `${homeLabel}: ${Math.round(homeShare * 100)}% • Nul: ${Math.round(drawShare * 100)}% • ${awayLabel}: ${Math.round(awayShare * 100)}%`
                : `${homeLabel}: ${Math.round(homeShare * 100)}% • Draw: ${Math.round(drawShare * 100)}% • ${awayLabel}: ${Math.round(awayShare * 100)}%`
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

            const statusTitleByState =
              locale === 'fr'
                ? {
                    successful: 'Pronostic réussi',
                    pending: 'Pronostic en attente (match à venir)',
                    unsuccessful: 'Pronostic non réussi',
                  }
                : {
                    successful: 'Successful prediction',
                    pending: 'Prediction saved (match in the future)',
                    unsuccessful: 'Unsuccessful prediction',
                  }
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
                    {predictionStatus ? (
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
                          className="border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
                        >
                          {locale === 'fr' ? 'Annuler' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          disabled={isSaving || !selectedOutcome || isPredictionClosed}
                          onClick={() => {
                            void submitPrediction(match.id, new Date(match.kickoff).getTime())
                          }}
                          className="bg-[var(--accent-muted)] px-3 py-1 text-sm font-semibold text-[var(--accent-text)] disabled:opacity-50"
                        >
                          {locale === 'fr' ? 'Enregistrer' : 'Save'}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

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
                        setSelectedOutcomes((current) => ({ ...current, [match.id]: item.value }))
                        setScoreInputs((current) => ({
                          ...current,
                          [match.id]: { home: '', away: '' },
                        }))
                        setDirtyMatches((current) => ({ ...current, [match.id]: true }))
                      }}
                      className={`w-full px-2 py-2 text-xs font-semibold sm:text-sm ${
                        selectedOutcome === item.value
                          ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]'
                          : 'bg-[var(--surface-soft)] text-[var(--text)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    value={scoreInput.home}
                    onChange={(event) => {
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
                    placeholder={homeTeam?.code ?? 'HOME'}
                    className="w-full border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-sm"
                  />
                  <span className="self-center text-center text-sm text-[var(--text-muted)]">Scores</span>
                  <input
                    type="number"
                    min={0}
                    value={scoreInput.away}
                    onChange={(event) => {
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
                    placeholder={awayTeam?.code ?? 'AWAY'}
                    className="w-full border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>{locale === 'fr' ? 'Tendance des pronostics' : 'Prediction trend'}</span>
                    <span>
                      {totalPredictions} {locale === 'fr' ? 'joueurs' : 'players'}
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
