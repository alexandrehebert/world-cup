/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { usePredictions } from '../../contexts/predictions-context'
import { useNow, useTimeZone } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate, formatPlaceholder, getDisplayMatchStatus, getMatchDisplayTime, getMatchWinner, hasDisplayScore } from '../../lib/format'
import { isPredictionsFeatureEnabled } from '../../lib/features'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'
import { LivePulse } from '../ui/live-pulse'
import { ModalShell } from '../ui/modal-shell'
import { StatusPill } from '../ui/status-pill'
import { FeedbackPopup } from '../ui/feedback-popup'
import { PredictionForm, getActualOutcome } from '../predictions/prediction-form'
import type { MatchOutcome } from '../../types/predictions'

type PredictionValidationIssue = 'outcome' | 'scores'
type PredictionErrorState = {
  message: string
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

const stageLabel = (stage: 'group' | 'roundOf32' | 'roundOf16' | 'quarterFinal' | 'semiFinal' | 'final' | 'thirdPlace', labels: ReturnType<typeof useLocale>['t']['labels']) => {
  if (stage === 'group') return labels.stageGroup
  if (stage === 'roundOf32') return labels.stageRoundOf32
  if (stage === 'roundOf16') return labels.stageRoundOf16
  if (stage === 'quarterFinal') return labels.stageQuarterFinal
  if (stage === 'semiFinal') return labels.stageSemiFinal
  if (stage === 'thirdPlace') return labels.stageThirdPlace
  return labels.stageFinal
}

const getUtcOffsetLabel = (kickoff: string, timeZone: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date(kickoff))

    const tzName = parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
    const normalized = tzName.replace('GMT', 'UTC').replace('UTC+0', 'UTC+0').replace('UTC-0', 'UTC+0')

    return normalized || 'UTC+0'
  } catch {
    return 'UTC+0'
  }
}

export const MatchModal = () => {
  const { getMatchSharePath, isFavoriteTeam, selectedMatchId, setSelectedMatchId, setSelectedTeamId } = useDashboard()
  const { user, openAuthModal } = useAuth()
  const { locale, t } = useLocale()
  const { predictionsByMatch, savePrediction, savingMatchId } = usePredictions()
  const nowMs = useNow()
  const timeZone = useTimeZone()
  const [isCopied, setIsCopied] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<MatchOutcome | null>(null)
  const [scoreInput, setScoreInput] = useState({ home: '', away: '' })
  const [draftMatchId, setDraftMatchId] = useState<string | null>(null)
  const [isDraftDirty, setIsDraftDirty] = useState(false)
  const [predictionError, setPredictionError] = useState<PredictionErrorState | null>(null)
  const { matchesById, teamsById } = useTournament()
  const match = selectedMatchId ? matchesById[selectedMatchId] : undefined
  const existingPrediction = match ? predictionsByMatch[match.id] : undefined
  const closeModal = useCallback(() => {
    setSelectedOutcome(null)
    setScoreInput({ home: '', away: '' })
    setDraftMatchId(null)
    setIsDraftDirty(false)
    setPredictionError(null)
    setSelectedMatchId(null)
  }, [setSelectedMatchId])

  useEffect(() => {
    if (selectedMatchId && !match) {
      closeModal()
    }
  }, [closeModal, match, selectedMatchId])

  useEffect(() => {
    if (!selectedMatchId || !match) {
      setSelectedOutcome(null)
      setScoreInput({ home: '', away: '' })
      setDraftMatchId(null)
      setIsDraftDirty(false)
      return
    }

    if (!existingPrediction) {
      setSelectedOutcome(null)
      setScoreInput({ home: '', away: '' })
      setDraftMatchId(match.id)
      setIsDraftDirty(false)
      return
    }

    setSelectedOutcome(existingPrediction.outcome)
    setScoreInput({
      home: String(existingPrediction.homeScore ?? ''),
      away: String(existingPrediction.awayScore ?? ''),
    })
    setDraftMatchId(match.id)
    setIsDraftDirty(false)
  }, [existingPrediction, match, selectedMatchId])

  if (!selectedMatchId || !match) {
    return null
  }
  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
  const homePlaceholder = match.home.placeholder ? formatPlaceholder(match.home.placeholder, t) : null
  const awayPlaceholder = match.away.placeholder ? formatPlaceholder(match.away.placeholder, t) : null
  const homeTeamLabel = homeTeam
    ? (t.teams[homeTeam.id] ?? homeTeam.name)
    : homePlaceholder
      ? homePlaceholder
      : t.labels.tbd
  const awayTeamLabel = awayTeam
    ? (t.teams[awayTeam.id] ?? awayTeam.name)
    : awayPlaceholder
      ? awayPlaceholder
      : t.labels.tbd
  const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
  const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
  const displayStatus = getDisplayMatchStatus(match, nowMs)
  const hasScore = hasDisplayScore(match, nowMs)
  const winner = getMatchWinner(match, nowMs)
  const homeWon = winner === 'home'
  const awayWon = winner === 'away'
  const homePenaltyScore = typeof match.home.penaltyScore === 'number' ? match.home.penaltyScore : null
  const awayPenaltyScore = typeof match.away.penaltyScore === 'number' ? match.away.penaltyScore : null
  const { localDateTime } = formatMatchDate(match.kickoff, locale, timeZone, t.labels.today)
  const { localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone, t.labels.today)
  const displayTime = displayStatus === 'live' ? getMatchDisplayTime(match, t.labels, nowMs, locale) : localTime
  const venueUtcOffset = getUtcOffsetLabel(match.kickoff, match.venue.timeZone)
  const dateLocaleByLanguage = { en: 'en-GB', fr: 'fr-FR' } as const
  const venueClock = new Intl.DateTimeFormat(dateLocaleByLanguage[locale], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: match.venue.timeZone,
  }).format(new Date(match.kickoff))
  const isPredictionOpen = match.status === 'scheduled' && new Date(match.kickoff).getTime() > nowMs
  const isSavingPrediction = savingMatchId === match.id
  const persistedOutcome = existingPrediction?.outcome
  const persistedHomeScore = existingPrediction?.type === 'score' && existingPrediction.homeScore !== undefined ? String(existingPrediction.homeScore) : ''
  const persistedAwayScore = existingPrediction?.type === 'score' && existingPrediction.awayScore !== undefined ? String(existingPrediction.awayScore) : ''
  const isDraftSyncedToMatch = draftMatchId === match.id
  const draftOutcome = isDraftSyncedToMatch ? selectedOutcome : (persistedOutcome ?? null)
  const draftScoreInput = isDraftSyncedToMatch ? scoreInput : { home: persistedHomeScore, away: persistedAwayScore }
  const hasDraftHomeScore = draftScoreInput.home.trim().length > 0
  const hasDraftAwayScore = draftScoreInput.away.trim().length > 0
  const inferredDraftOutcome = inferOutcomeFromScores(draftScoreInput.home, draftScoreInput.away)
  const effectiveOutcome = inferredDraftOutcome ?? draftOutcome
  const isOutcomeInvalid = predictionError?.issue === 'outcome' && !effectiveOutcome
  const isScoresInvalid = predictionError?.issue === 'scores'
  const isHomeScoreInvalid = isScoresInvalid && !hasDraftHomeScore && hasDraftAwayScore
  const isAwayScoreInvalid = isScoresInvalid && !hasDraftAwayScore && hasDraftHomeScore
  const hasPredictionChanges =
    isDraftDirty &&
    isDraftSyncedToMatch &&
    ((draftOutcome ?? null) !== (persistedOutcome ?? null) ||
      draftScoreInput.home.trim() !== persistedHomeScore ||
      draftScoreInput.away.trim() !== persistedAwayScore)

  const actualOutcome = getActualOutcome(match.home.score, match.away.score, match.status, match.home.penaltyScore, match.away.penaltyScore)
  const isMatchLive = match.status === 'live'
  const isPredictionScored = Boolean(existingPrediction?.scoredAt)
  const isPredictionCorrect = isPredictionScored && (existingPrediction?.pointsAwarded ?? 0) > 0

  const quickOptions: Array<{ value: MatchOutcome; label: string }> = [
    { value: 'home', label: homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : t.labels.home },
    { value: 'draw', label: t.labels.draw },
    { value: 'away', label: awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : t.labels.away },
  ]

  const submitPrediction = async () => {
    const homeRaw = draftScoreInput.home.trim()
    const awayRaw = draftScoreInput.away.trim()
    const hasAnyScore = homeRaw.length > 0 || awayRaw.length > 0
    const normalizedHomeScore = homeRaw.length > 0 ? homeRaw : '0'
    const normalizedAwayScore = awayRaw.length > 0 ? awayRaw : '0'
    const normalizedScoreOutcome = hasAnyScore ? inferOutcomeFromScores(normalizedHomeScore, normalizedAwayScore) : null
    const outcome = normalizedScoreOutcome ?? effectiveOutcome

    if (!outcome) {
      setPredictionError({
        message: t.labels.pickWinnerOrDrawFirst,
        issue: 'outcome',
      })
      return
    }

    setPredictionError(null)

    try {
      const saved = await savePrediction({
        matchId: match.id,
        outcome,
        ...(hasAnyScore ? { homeScore: normalizedHomeScore, awayScore: normalizedAwayScore } : {}),
      })

      setSelectedOutcome(saved.outcome)
      setScoreInput({
        home: String(saved.homeScore ?? ''),
        away: String(saved.awayScore ?? ''),
      })
      setDraftMatchId(match.id)
      setIsDraftDirty(false)
    } catch (error) {
      setPredictionError({
        message: error instanceof Error ? error.message : t.labels.saveFailed,
      })
    }
  }

  const copyShareLink = async () => {
    if (typeof window === 'undefined') {
      return
    }

    const shareUrl = new URL(getMatchSharePath(match.id), window.location.origin).href
    await window.navigator.clipboard.writeText(shareUrl)
    setIsCopied(true)
    window.setTimeout(() => {
      setIsCopied(false)
    }, 1400)
  }

  return (
    <ModalShell
      titleId="match-modal-title"
      title={t.labels.details}
      onClose={closeModal}
      headerActions={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void copyShareLink()}
            className="cursor-pointer rounded-full p-1.5 text-[var(--text)] transition hover:text-[var(--text-strong)]"
            aria-label={t.labels.share}
            title={isCopied ? t.labels.copied : t.labels.share}
          >
            <Icon name={isCopied ? 'check' : 'share'} className={`text-[20px] ${isCopied ? 'text-[var(--accent-text)]' : ''}`.trim()} />
          </button>
        </div>
      }
      footer={
        predictionError?.message ? (
          <FeedbackPopup
            message={predictionError.message}
            onDismiss={() => setPredictionError(null)}
            dismissLabel={t.labels.close}
          />
        ) : null
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{t.labels.status}</p>
          <div className="mt-2">
            <StatusPill
              status={displayStatus}
              label={
                displayStatus === 'live'
                  ? <span className="inline-flex items-center gap-1.5"><LivePulse className="h-3 w-3" /><span>{t.labels.live}</span></span>
                  : displayStatus === 'finished'
                    ? t.labels.finished
                    : t.labels.scheduled
              }
            />
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{t.labels.kickoff}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-strong)]">{localDateTime}</p>
        </div>
      </div>

      <div className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <p className="text-center text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{stageLabel(match.stage, t.labels)}</p>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0 p-2 text-center">
            <div className="mx-auto mb-2 w-fit">
              {homeTeam ? <FlagAvatar team={homeTeam} className="h-14 w-14" /> : <span className="block h-14 w-14 rounded-full border border-[var(--border)]" aria-hidden="true" />}
            </div>
            <p className="flex items-center justify-center gap-1.5 text-base font-semibold text-[var(--text-strong)] sm:text-lg">
              {homeTeam ? (
                <button
                  type="button"
                  onClick={() => setSelectedTeamId(homeTeam.id)}
                  className={`truncate cursor-pointer hover:underline ${homeWon ? 'text-[var(--accent-text)]' : ''}`.trim()}
                >
                  {homeTeamLabel}
                </button>
              ) : (
                <span className={`truncate ${homeWon ? 'text-[var(--accent-text)]' : ''}`.trim()}>{homeTeamLabel}</span>
              )}
              {homeIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{homeTeam?.code ?? t.labels.tbd}</p>
          </div>

          <div className="flex flex-col items-center gap-1 px-2">
            {hasScore ? (
              <>
                <p className="text-3xl font-black leading-none text-[var(--text-strong)] sm:text-4xl">
                  {match.home.score} - {match.away.score}
                </p>
                {homePenaltyScore !== null && awayPenaltyScore !== null ? (
                  <p className="text-sm text-[var(--text-soft)]" aria-label={`${t.labels.penalties}: ${homePenaltyScore} - ${awayPenaltyScore}`}>
                    ({homePenaltyScore}) {t.labels.penalties} ({awayPenaltyScore})
                  </p>
                ) : null}
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
                  {displayStatus === 'finished' ? t.labels.finished : t.labels.live}
                </p>
                {displayStatus === 'live' && displayTime ? (
                  <p className="text-sm font-semibold text-[var(--text-strong)]">{displayTime}</p>
                ) : null}
              </>
            ) : (
              <p className="text-2xl font-black uppercase tracking-[0.28em] text-[var(--text-strong)] sm:text-3xl">{t.labels.vs}</p>
            )}
          </div>

          <div className="min-w-0 p-2 text-center">
            <div className="mx-auto mb-2 w-fit">
              {awayTeam ? <FlagAvatar team={awayTeam} className="h-14 w-14" /> : <span className="block h-14 w-14 rounded-full border border-[var(--border)]" aria-hidden="true" />}
            </div>
            <p className="flex items-center justify-center gap-1.5 text-base font-semibold text-[var(--text-strong)] sm:text-lg">
              {awayTeam ? (
                <button
                  type="button"
                  onClick={() => setSelectedTeamId(awayTeam.id)}
                  className={`truncate cursor-pointer hover:underline ${awayWon ? 'text-[var(--accent-text)]' : ''}`.trim()}
                >
                  {awayTeamLabel}
                </button>
              ) : (
                <span className={`truncate ${awayWon ? 'text-[var(--accent-text)]' : ''}`.trim()}>{awayTeamLabel}</span>
              )}
              {awayIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{awayTeam?.code ?? t.labels.tbd}</p>
          </div>
        </div>
      </div>

      {isPredictionsFeatureEnabled ? (
        <div className="space-y-3 border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
              {t.labels.prediction}
            </p>
            <div className="flex items-center gap-2">
              {user && isPredictionOpen && hasPredictionChanges ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSavingPrediction}
                    onClick={() => {
                      setPredictionError(null)
                      setSelectedOutcome(persistedOutcome ?? null)
                      setScoreInput({ home: persistedHomeScore, away: persistedAwayScore })
                      setDraftMatchId(match.id)
                      setIsDraftDirty(false)
                    }}
                    className="cursor-pointer border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.labels.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingPrediction}
                    onClick={() => {
                      void submitPrediction()
                    }}
                    className="cursor-pointer bg-[var(--accent-muted)] px-3 py-1 text-sm font-semibold text-[var(--accent-text)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.labels.save}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {isPredictionOpen ? (
            !user ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {quickOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => openAuthModal('login')}
                      className="cursor-pointer bg-[var(--surface-soft)] px-2 py-2 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)] sm:text-sm"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {t.labels.signInToSavePrediction}
                </p>
              </div>
            ) : (
              <PredictionForm
                homeLabel={homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : t.labels.home}
                awayLabel={awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : t.labels.away}
                selectedOutcome={draftOutcome}
                scoreInput={draftScoreInput}
                onOutcomeChange={(outcome) => {
                  setPredictionError(null)
                  if (draftOutcome === outcome) return
                  setDraftMatchId(match.id)
                  setSelectedOutcome(outcome)
                  setScoreInput({ home: '', away: '' })
                  setIsDraftDirty(true)
                }}
                onScoreChange={(next) => {
                  setPredictionError(null)
                  const inferredOutcome = inferOutcomeFromScores(next.home, next.away)
                  setDraftMatchId(match.id)
                  setIsDraftDirty(true)
                  setScoreInput(next)
                  if (inferredOutcome) setSelectedOutcome(inferredOutcome)
                }}
                isOutcomeInvalid={isOutcomeInvalid}
                isHomeScoreInvalid={isHomeScoreInvalid}
                isAwayScoreInvalid={isAwayScoreInvalid}
                isSaving={isSavingPrediction}
              />
            )
          ) : (
            existingPrediction ? (
              <PredictionForm
                readOnly
                homeLabel={homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : t.labels.home}
                awayLabel={awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : t.labels.away}
                selectedOutcome={persistedOutcome ?? null}
                scoreInput={{ home: persistedHomeScore, away: persistedAwayScore }}
                actualOutcome={actualOutcome}
                isLive={isMatchLive}
                isScored={isPredictionScored}
                isCorrect={isPredictionCorrect}
              />
            ) : (
              <p className="text-sm text-[var(--text-muted)]">{t.labels.noPredictionForMatch}</p>
            )
          )}
        </div>
      ) : null}

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{t.meta.venue}</p>
          <p className="mt-2 text-base font-semibold text-[var(--text-strong)]">{match.venue.stadium}</p>
          <p className="mt-1 text-sm text-[var(--text)]">
            {match.venue.city}, {match.venue.country}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{t.meta.localTime}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-strong)]">{venueClock} {venueUtcOffset}</p>
        </div>
      </div>
    </ModalShell>
  )
}
