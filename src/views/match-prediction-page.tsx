/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PredictionForm } from '../components/predictions/prediction-form'
import { FlagAvatar } from '../components/ui/flag-avatar'
import { ModalShell } from '../components/ui/modal-shell'
import { useAuth } from '../contexts/auth-context'
import { useBootstrapData } from '../contexts/bootstrap-context'
import { useLocale } from '../contexts/locale-context'
import { useNow, useTimeZone } from '../contexts/time-context'
import { useTournament } from '../contexts/tournament-context'
import { resolveCompetitionId } from '../competitions'
import { useDashboard } from '../contexts/dashboard-context'
import { hidesGroupStageLabel } from '../lib/competition-sections'
import { getMatchStageFromSlug } from '../lib/match-path'
import { formatMatchDate } from '../lib/format'
import { isAccountFeatureEnabled } from '../lib/features'
import { Icon } from '../lib/icons'
import { inferOutcomeFromScores } from '../lib/predictions'
import type { MatchOutcome, PredictionDistribution, PredictionRecord } from '../types/predictions'
import type { MatchRecord } from '../types/tournament'
import { PredictionsPage } from './predictions-page'

type PublicPrediction = PredictionRecord & { displayName: string }
type PublicPredictionResponse = {
  predictions: PublicPrediction[]
  predictionDistribution: PredictionDistribution
  currentPredictorId?: string | null
  currentPrediction?: PublicPrediction | null
}

const normalizeCode = (value: string | undefined) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '')
const normalizeName = (value: string | undefined) => String(value ?? '').trim().toLowerCase()

const stageLabel = (stage: MatchRecord['stage'], labels: ReturnType<typeof useLocale>['t']['labels']) => {
  if (stage === 'group') return labels.stageGroup
  if (stage === 'roundOf32') return labels.stageRoundOf32
  if (stage === 'roundOf16') return labels.stageRoundOf16
  if (stage === 'quarterFinal') return labels.stageQuarterFinal
  if (stage === 'semiFinal') return labels.stageSemiFinal
  if (stage === 'thirdPlace') return labels.stageThirdPlace
  return labels.stageFinal
}

const getOutcomeFromScores = (homeScore: number, awayScore: number): MatchOutcome => {
  if (homeScore > awayScore) return 'home'
  if (homeScore < awayScore) return 'away'
  return 'draw'
}

export const MatchPredictionPage = () => {
  const { homeCode, awayCode, stage, round, slot } = useParams<{
    homeCode: string
    awayCode: string
    stage: string
    round: string
    slot: string
  }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, openAuthModal } = useAuth()
  const bootstrapData = useBootstrapData()
  const { locale, t } = useLocale()
  const nowMs = useNow()
  const timeZone = useTimeZone()
  const { getTeamSharePath } = useDashboard()
  const { meta, bracketRounds, matchesById, teamsById } = useTournament()
  const competitionId = resolveCompetitionId(meta.competitionId)
  const hideGroupStage = hidesGroupStageLabel(competitionId)
  const bootstrapPublicPrediction = bootstrapData?.initialPublicMatchPrediction
  const [predictionsByMatchId, setPredictionsByMatchId] = useState<Record<string, PublicPredictionResponse>>(() =>
    bootstrapPublicPrediction ? { [bootstrapPublicPrediction.matchId]: bootstrapPublicPrediction } : {},
  )
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guestName, setGuestName] = useState(user?.username ?? '')
  const [selectedOutcome, setSelectedOutcome] = useState<MatchOutcome | null>(null)
  const [scoreInput, setScoreInput] = useState({ home: '', away: '' })
  const routeStage = stage ? getMatchStageFromSlug(stage) : null

  useEffect(() => {
    if (user?.username) {
      setGuestName(user.username)
    }
  }, [user?.username])

  const match = useMemo(() => {
    const matchIdFromQuery = searchParams.get('match')?.trim() ?? ''
    if (matchIdFromQuery && matchesById[matchIdFromQuery]) {
      return matchesById[matchIdFromQuery] ?? null
    }

    if (routeStage && homeCode && awayCode) {
      const normalizedHome = normalizeCode(homeCode)
      const normalizedAway = normalizeCode(awayCode)

      if (normalizedHome && normalizedAway) {
        const stageMatch = Object.values(matchesById).find((entry) => {
          if (entry.stage !== routeStage) {
            return false
          }

          const homeTeam = entry.home.teamId ? teamsById[entry.home.teamId] : undefined
          const awayTeam = entry.away.teamId ? teamsById[entry.away.teamId] : undefined
          return normalizeCode(homeTeam?.code) === normalizedHome && normalizeCode(awayTeam?.code) === normalizedAway
        })

        if (stageMatch) {
          return stageMatch
        }
      }
    }

    if (round && slot) {
      const bracketRound = bracketRounds.find((entry) => entry.id === round)
      const slotIndex = Number.parseInt(slot, 10)

      if (bracketRound && Number.isInteger(slotIndex) && slotIndex > 0) {
        const matchId = bracketRound.matchIds[slotIndex - 1]
        return matchId ? matchesById[matchId] ?? null : null
      }
    }

    if (!homeCode || !awayCode) {
      return null
    }

    const normalizedHome = normalizeCode(homeCode)
    const normalizedAway = normalizeCode(awayCode)

    if (!normalizedHome || !normalizedAway) return null

    return Object.values(matchesById).find((entry) => {
      const homeTeam = entry.home.teamId ? teamsById[entry.home.teamId] : undefined
      const awayTeam = entry.away.teamId ? teamsById[entry.away.teamId] : undefined
      return normalizeCode(homeTeam?.code) === normalizedHome && normalizeCode(awayTeam?.code) === normalizedAway
    }) ?? null
  }, [awayCode, bracketRounds, homeCode, matchesById, routeStage, round, searchParams, slot, teamsById])

  const homeTeam = match?.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match?.away.teamId ? teamsById[match.away.teamId] : undefined
  const homeLabel = homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : t.labels.tbd
  const awayLabel = awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : t.labels.tbd
  const matchId = match?.id ?? null
  const cachedPredictionResponse = matchId ? predictionsByMatchId[matchId] : undefined
  const predictions = cachedPredictionResponse?.predictions ?? []
  const distribution = cachedPredictionResponse?.predictionDistribution ?? null
  const currentPredictorId = cachedPredictionResponse?.currentPrediction?.userId
    ?? cachedPredictionResponse?.currentPredictorId
    ?? (user ? user.id : null)
  const currentUserId = currentPredictorId ?? (user ? user.id : null)
  const currentPredictionById = currentUserId
    ? predictions.find((prediction) => prediction.userId === currentUserId) ?? null
    : null
  const currentPrediction = currentPredictionById
    ?? (user
      ? predictions.find((prediction) => normalizeName(prediction.displayName) === normalizeName(user.username)) ?? null
      : null)
  const hasSavedPrediction = Boolean(currentPrediction)
  const persistedOutcome = currentPrediction?.outcome ?? null
  const persistedHomeScore = currentPrediction?.type === 'score' && currentPrediction.homeScore !== undefined ? String(currentPrediction.homeScore) : ''
  const persistedAwayScore = currentPrediction?.type === 'score' && currentPrediction.awayScore !== undefined ? String(currentPrediction.awayScore) : ''
  const isPredictionOpen = Boolean(match && match.status === 'scheduled' && new Date(match.kickoff).getTime() > nowMs)
  const hasScoreInput = scoreInput.home.trim() !== '' || scoreInput.away.trim() !== ''
  const hasPredictionChanges =
    (selectedOutcome ?? null) !== persistedOutcome ||
    scoreInput.home.trim() !== persistedHomeScore ||
    scoreInput.away.trim() !== persistedAwayScore
  const isNameFieldError = !user && (error === t.labels.enterNameToPredict || error === 'Name is required')
  const applyPublicPredictionResponse = useCallback((matchIdToUpdate: string, payload: PublicPredictionResponse) => {
    setPredictionsByMatchId((current) => ({
      ...current,
      [matchIdToUpdate]: payload,
    }))
    if (!user && payload.currentPrediction?.displayName) {
      setGuestName(payload.currentPrediction.displayName)
    }
  }, [user])

  useEffect(() => {
    if (!bootstrapPublicPrediction) {
      return
    }

    setPredictionsByMatchId((current) => ({
      ...current,
      [bootstrapPublicPrediction.matchId]: bootstrapPublicPrediction,
    }))
  }, [bootstrapPublicPrediction])

  useEffect(() => {
    if (!matchId) {
      return
    }
    if (cachedPredictionResponse) {
      return
    }

    const controller = new AbortController()

    const loadPublicPredictions = async () => {
      setError(null)
      setIsLoadingPredictions(true)

      try {
        const response = await fetch(`/api/predictions/public?matchId=${encodeURIComponent(matchId)}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string }
          throw new Error(payload.error ?? t.labels.saveFailed)
        }

        const payload = (await response.json()) as PublicPredictionResponse
        applyPublicPredictionResponse(matchId, payload)
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return
        }
        setError(loadError instanceof Error ? loadError.message : t.labels.saveFailed)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPredictions(false)
        }
      }
    }

    void loadPublicPredictions()

    return () => {
      controller.abort()
    }
  }, [applyPublicPredictionResponse, cachedPredictionResponse, matchId, t.labels.saveFailed])

  useEffect(() => {
    setSelectedOutcome(persistedOutcome)
    setScoreInput({
      home: persistedHomeScore,
      away: persistedAwayScore,
    })
  }, [persistedAwayScore, persistedHomeScore, persistedOutcome, currentPrediction?.updatedAt])

  const handleSavePrediction = async () => {
    if (!match) return
    const homeRaw = scoreInput.home.trim()
    const awayRaw = scoreInput.away.trim()
    const hasAnyScore = homeRaw.length > 0 || awayRaw.length > 0
    const normalizedHomeScore = homeRaw.length > 0 ? homeRaw : '0'
    const normalizedAwayScore = awayRaw.length > 0 ? awayRaw : '0'
    const normalizedScoreOutcome = hasAnyScore ? inferOutcomeFromScores(normalizedHomeScore, normalizedAwayScore) : null

    if (!selectedOutcome && !normalizedScoreOutcome) {
      setError(t.labels.pickWinnerOrDrawFirst)
      return
    }

    const name = guestName.trim()
    if (!user && !name) {
      setError(t.labels.enterNameToPredict)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/predictions/public', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          matchId: match.id,
          type: hasAnyScore ? 'score' : 'outcome',
          outcome: normalizedScoreOutcome ?? selectedOutcome,
          homeScore: hasAnyScore ? normalizedHomeScore : undefined,
          awayScore: hasAnyScore ? normalizedAwayScore : undefined,
          guestName: name,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error ?? t.labels.saveFailed)
      }

      const payload = (await response.json()) as PublicPredictionResponse
      applyPublicPredictionResponse(match.id, payload)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t.labels.saveFailed)
    } finally {
      setIsSaving(false)
    }
  }

  const shareOnWhatsApp = () => {
    if (!match || typeof window === 'undefined') return
    const url = window.location.href
    const text = locale === 'fr'
      ? `Fais ton pronostic pour ${homeLabel} vs ${awayLabel} : ${url}`
      : locale === 'es'
        ? `Haz tu pronóstico para ${homeLabel} vs ${awayLabel}: ${url}`
      : `Do your prediction for ${homeLabel} vs ${awayLabel}: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  if (!match) {
    return (
      <>
        <PredictionsPage />
        <ModalShell
          titleId="match-prediction-modal-title"
          title={t.labels.doYourPrediction}
          onClose={() => navigate('/predictions')}
          maxWidthClass="max-w-3xl"
        >
          <section className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
            {t.labels.noMatchSelected}
          </section>
        </ModalShell>
      </>
    )
  }

  const { localDateTime } = formatMatchDate(match.kickoff, locale, timeZone, t.labels.today)
  const totalPredictions = distribution?.totalPredictions ?? 0
  const homeShare = totalPredictions > 0 && distribution ? distribution.homeCount / totalPredictions : 0
  const drawShare = totalPredictions > 0 && distribution ? distribution.drawCount / totalPredictions : 0
  const awayShare = totalPredictions > 0 && distribution ? distribution.awayCount / totalPredictions : 0
  const maxShare = Math.max(homeShare, drawShare, awayShare)
  const dominantOutcome = maxShare === 0 ? 'neutral' : homeShare === maxShare ? 'home' : drawShare === maxShare ? 'draw' : 'away'
  const heatColor = { home: 'rgb(52 211 153)', draw: 'rgb(168 162 158)', away: 'rgb(56 189 248)', neutral: 'rgb(161 161 170)' } as const
  const heatOpacity = totalPredictions > 0 ? 0.25 + maxShare * 0.55 : 0.2
  const trendPos = Math.round((drawShare * 50 + awayShare * 100) * 10) / 10
  const trendTooltip = `${homeLabel}: ${Math.round(homeShare * 100)}% • ${t.labels.draw}: ${Math.round(drawShare * 100)}% • ${awayLabel}: ${Math.round(awayShare * 100)}%`
  const isMatchLive = match.status === 'live'
  const isMatchFinished = match.status === 'finished'
  const liveHomeScore = typeof match.home.score === 'number' ? match.home.score : null
  const liveAwayScore = typeof match.away.score === 'number' ? match.away.score : null
  const currentOutcome = (isMatchLive || isMatchFinished) && liveHomeScore !== null && liveAwayScore !== null
    ? getOutcomeFromScores(liveHomeScore, liveAwayScore)
    : null

  return (
    <>
      <PredictionsPage />
      <ModalShell
        titleId="match-prediction-modal-title"
        title={t.labels.doYourPrediction}
        onClose={() => navigate('/predictions')}
        maxWidthClass="max-w-3xl"
        headerActions={
          <button
            type="button"
            onClick={shareOnWhatsApp}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full p-1.5 text-[var(--text)] transition hover:text-[var(--text-strong)]"
            aria-label={t.labels.shareOnWhatsApp}
            title={t.labels.shareOnWhatsApp}
          >
            <Icon name="share" className="text-[20px]" />
          </button>
        }
        footer={
          isPredictionOpen && hasPredictionChanges ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[var(--text-muted)]">
                {locale === 'fr' ? 'Enregistrer mon pronostic' : locale === 'es' ? 'Guardar mi pronóstico' : 'Save my prediction'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setError(null)
                    setSelectedOutcome(persistedOutcome)
                    setScoreInput({ home: persistedHomeScore, away: persistedAwayScore })
                  }}
                  className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.labels.cancel}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    void handleSavePrediction()
                  }}
                  className="cursor-pointer bg-[var(--accent-muted)] px-3 py-1 text-sm font-semibold text-[var(--accent-text)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.labels.save}
                </button>
              </div>
            </div>
          ) : null
        }
      >
        <section className="space-y-4">
      <div className={`space-y-4 border bg-[var(--surface)] p-4 ${hasSavedPrediction ? 'border-emerald-400/70' : 'border-[var(--border)]'}`}>
        {match.stage === 'group' && hideGroupStage ? null : (
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{stageLabel(match.stage, t.labels)}</p>
        )}
        <p className="text-sm text-[var(--text-muted)]">{localDateTime}</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--border)] pb-4">
          <div className="text-center">
            {homeTeam ? <FlagAvatar team={homeTeam} className="mx-auto h-12 w-12" /> : null}
            {homeTeam ? (
              <button
                type="button"
                onClick={() => navigate(getTeamSharePath(homeTeam.id))}
                className="mt-2 cursor-pointer text-base font-semibold text-[var(--text-strong)] transition hover:text-[var(--accent-text)] hover:underline"
              >
                {homeLabel}
              </button>
            ) : (
              <p className="mt-2 text-base font-semibold text-[var(--text-strong)]">{homeLabel}</p>
            )}
          </div>
          <p className="text-xl font-black text-[var(--text-strong)]">{t.labels.vs}</p>
          <div className="text-center">
            {awayTeam ? <FlagAvatar team={awayTeam} className="mx-auto h-12 w-12" /> : null}
            {awayTeam ? (
              <button
                type="button"
                onClick={() => navigate(getTeamSharePath(awayTeam.id))}
                className="mt-2 cursor-pointer text-base font-semibold text-[var(--text-strong)] transition hover:text-[var(--accent-text)] hover:underline"
              >
                {awayLabel}
              </button>
            ) : (
              <p className="mt-2 text-base font-semibold text-[var(--text-strong)]">{awayLabel}</p>
            )}
          </div>
        </div>
        <h3 className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
          {locale === 'fr' ? 'Ton pronostic' : locale === 'es' ? 'Tu pronóstico' : 'Your prediction'}
        </h3>
        <div className="space-y-2">
          <div className="relative">
            <input
              id="guest-name"
              type="text"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              readOnly={Boolean(user)}
              className={`w-full border bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-strong)] ${isNameFieldError ? 'border-rose-400 ring-1 ring-rose-400' : 'border-[var(--border)]'} ${user ? '' : 'pr-28'}`}
              placeholder={t.labels.yourName}
            />
            {!user && isAccountFeatureEnabled ? (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-semibold text-[var(--accent-text)] underline decoration-1 underline-offset-2"
              >
                {t.labels.signIn}
              </button>
            ) : null}
          </div>
          {isNameFieldError ? <p className="text-sm text-rose-400">{t.labels.enterNameToPredict}</p> : null}
        </div>

        <PredictionForm
          homeLabel={homeLabel}
          awayLabel={awayLabel}
          homeOptionIcon={homeTeam ? <FlagAvatar team={homeTeam} className="h-4 w-4" /> : undefined}
          awayOptionIcon={awayTeam ? <FlagAvatar team={awayTeam} className="h-4 w-4" /> : undefined}
          selectedOutcome={selectedOutcome}
          scoreInput={scoreInput}
          isScoreVisible={Boolean(selectedOutcome)}
          onOutcomeChange={(outcome) => {
            setError(null)
            setSelectedOutcome(outcome)
            if (!hasScoreInput) return
            setScoreInput({ home: '', away: '' })
          }}
          onScoreChange={(next) => {
            setError(null)
            setScoreInput(next)
            const inferred = inferOutcomeFromScores(next.home, next.away)
            if (inferred) {
              setSelectedOutcome(inferred)
            }
          }}
          isSaving={isSaving}
        />

        {!isPredictionOpen ? <p className="text-sm text-[var(--text-muted)]">{t.labels.predictionClosedStarted}</p> : null}
        {error && !isNameFieldError ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>

      <div className="space-y-2 border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{t.labels.currentPredictions}</h3>
        {isLoadingPredictions && !cachedPredictionResponse ? (
          <p className="text-sm text-[var(--text-muted)]">{t.labels.loadingSession}</p>
        ) : predictions.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t.labels.noPredictionsYet}</p>
        ) : null}
        <ul className="space-y-2">
          {predictions.map((prediction) => {
            const isCorrect = currentOutcome ? prediction.outcome === currentOutcome : null
            const rowStateClass = !currentOutcome
              ? 'border-[var(--border)] bg-[var(--surface-soft)]'
              : isCorrect
                ? isMatchFinished
                  ? 'border-emerald-400/70 bg-emerald-500/10'
                  : 'border-amber-400/70 bg-amber-500/10'
                : isMatchFinished
                  ? 'border-rose-400/70 bg-rose-500/10'
                  : 'border-rose-400/50 bg-rose-500/10'

            return (
            <li key={`${prediction.userId}-${prediction.matchId}`} className={`flex items-center justify-between gap-3 border px-3 py-2 ${rowStateClass}`}>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold text-[var(--text-strong)]">{prediction.displayName}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(prediction.updatedAt))}
                </p>
                {currentOutcome !== null ? (
                  <p className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                    isCorrect ? (isMatchFinished ? 'text-emerald-300' : 'text-amber-300') : 'text-rose-300'
                  }`}>
                    <Icon name={isCorrect ? 'check_circle' : 'cancel'} className="text-sm" />
                    {isMatchFinished
                      ? (isCorrect ? t.labels.predictionSuccessful : t.labels.predictionUnsuccessful)
                      : t.labels.predictionLive}
                  </p>
                ) : null}
              </div>
              <span className="text-sm font-semibold text-[var(--accent-text)]">
                {prediction.type === 'score' && prediction.homeScore !== undefined && prediction.awayScore !== undefined
                  ? `${prediction.homeScore}-${prediction.awayScore}`
                  : prediction.outcome === 'home'
                    ? homeLabel
                    : prediction.outcome === 'away'
                      ? awayLabel
                      : t.labels.draw}
              </span>
            </li>
            )
          })}
        </ul>
      </div>
      <div className="space-y-2 border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>{t.labels.predictionTrend}</span>
          <span>{totalPredictions} {t.labels.players}</span>
        </div>
        <div title={trendTooltip} className="relative h-2 overflow-hidden rounded bg-[var(--surface-soft)]">
          <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--text-muted)]/40" />
          {totalPredictions > 0 ? (
            <>
              <span aria-hidden className="absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[10px]" style={{ left: `${trendPos}%`, backgroundColor: heatColor[dominantOutcome], opacity: heatOpacity }} />
              <span aria-hidden className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--surface)]" style={{ left: `${trendPos}%`, backgroundColor: heatColor[dominantOutcome] }} />
            </>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px] text-[var(--text-muted)]">
          <p className="truncate">{homeLabel} {Math.round(homeShare * 100)}%</p>
          <p className="truncate text-center">{t.labels.draw} {Math.round(drawShare * 100)}%</p>
          <p className="truncate text-right">{awayLabel} {Math.round(awayShare * 100)}%</p>
        </div>
      </div>
        </section>
      </ModalShell>
    </>
  )
}
