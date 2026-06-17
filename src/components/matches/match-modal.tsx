/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { usePredictions } from '../../contexts/predictions-context'
import { useNow } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate, getDisplayMatchStatus, getMatchDisplayTime, hasDisplayScore } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'
import { LivePulse } from '../ui/live-pulse'
import { StatusPill } from '../ui/status-pill'
import type { MatchOutcome } from '../../types/predictions'

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
  const { getMatchSharePath, isFavoriteTeam, selectedMatchId, setSelectedMatchId } = useDashboard()
  const { user, openAuthModal } = useAuth()
  const { locale, t } = useLocale()
  const { predictionsByMatch, savePrediction, savingMatchId } = usePredictions()
  const nowMs = useNow()
  const [isCopied, setIsCopied] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<MatchOutcome | null>(null)
  const [scoreInput, setScoreInput] = useState({ home: '', away: '' })
  const [draftMatchId, setDraftMatchId] = useState<string | null>(null)
  const [isDraftDirty, setIsDraftDirty] = useState(false)
  const [predictionError, setPredictionError] = useState<string | null>(null)
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
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
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
  const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
  const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
  const displayStatus = getDisplayMatchStatus(match, nowMs)
  const hasScore = hasDisplayScore(match, nowMs)
  const homeWon = displayStatus === 'finished' && hasScore && (match.home.score ?? 0) > (match.away.score ?? 0)
  const awayWon = displayStatus === 'finished' && hasScore && (match.away.score ?? 0) > (match.home.score ?? 0)
  const { localDateTime } = formatMatchDate(match.kickoff, locale, undefined, t.labels.today)
  const { localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone, t.labels.today)
  const displayTime = displayStatus === 'live' ? getMatchDisplayTime(match, t.labels, nowMs, locale) : localTime
  const venueUtcOffset = getUtcOffsetLabel(match.kickoff, match.venue.timeZone)
  const venueClock = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
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
  const inferredDraftOutcome = inferOutcomeFromScores(draftScoreInput.home, draftScoreInput.away)
  const effectiveOutcome = inferredDraftOutcome ?? draftOutcome
  const hasPredictionChanges =
    isDraftDirty &&
    isDraftSyncedToMatch &&
    ((draftOutcome ?? null) !== (persistedOutcome ?? null) ||
      draftScoreInput.home.trim() !== persistedHomeScore ||
      draftScoreInput.away.trim() !== persistedAwayScore)

  const quickOptions: Array<{ value: MatchOutcome; label: string }> = [
    { value: 'home', label: homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : 'Home' },
    { value: 'draw', label: locale === 'fr' ? 'Nul' : 'Draw' },
    { value: 'away', label: awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : 'Away' },
  ]

  const submitPrediction = async () => {
    const outcome = effectiveOutcome

    if (!outcome) {
      setPredictionError(locale === 'fr' ? 'Choisis un gagnant ou nul.' : 'Pick a winner or draw first.')
      return
    }

    const hasHomeScore = draftScoreInput.home.trim().length > 0
    const hasAwayScore = draftScoreInput.away.trim().length > 0

    if ((hasHomeScore && !hasAwayScore) || (!hasHomeScore && hasAwayScore)) {
      setPredictionError(locale === 'fr' ? 'Entre les deux scores, ou laisse vide.' : 'Enter both scores, or leave both empty.')
      return
    }

    setPredictionError(null)

    try {
      const saved = await savePrediction({
        matchId: match.id,
        outcome,
        ...(hasHomeScore && hasAwayScore ? { homeScore: draftScoreInput.home, awayScore: draftScoreInput.away } : {}),
      })

      setSelectedOutcome(saved.outcome)
      setScoreInput({
        home: String(saved.homeScore ?? ''),
        away: String(saved.awayScore ?? ''),
      })
      setDraftMatchId(match.id)
      setIsDraftDirty(false)
    } catch (error) {
      setPredictionError(error instanceof Error ? error.message : locale === 'fr' ? 'Erreur de sauvegarde.' : 'Save failed.')
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/65 px-4 py-4 backdrop-blur-sm sm:py-6"
      role="presentation"
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-modal-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] shadow-2xl shadow-slate-950/30 sm:max-h-[calc(100dvh-3rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/70 px-5 py-4 backdrop-blur sm:px-6">
          <h3 id="match-modal-title" className="text-lg font-semibold text-[var(--text-strong)]">
            {t.labels.details}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void copyShareLink()}
              className="cursor-pointer rounded-full p-1.5 text-[var(--text)] transition hover:text-[var(--text-strong)]"
              aria-label={t.labels.share}
              title={isCopied ? 'Copied' : t.labels.share}
            >
              <Icon name={isCopied ? 'check' : 'share'} className={`text-[20px] ${isCopied ? 'text-[var(--accent-text)]' : ''}`.trim()} />
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="cursor-pointer rounded-full p-1 text-[var(--text)] transition hover:text-[var(--text-strong)]"
              aria-label="Close"
            >
              <Icon name="close" className="text-[24px]" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
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
                  <span className={`truncate ${homeWon ? 'text-[var(--accent-text)]' : ''}`.trim()}>{homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : 'TBD'}</span>
                  {homeIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{homeTeam?.code ?? 'TBD'}</p>
              </div>

              <div className="flex flex-col items-center gap-1 px-2">
                {hasScore ? (
                  <>
                    <p className="text-3xl font-black leading-none text-[var(--text-strong)] sm:text-4xl">
                      {match.home.score} - {match.away.score}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
                      {displayStatus === 'finished' ? t.labels.finished : t.labels.live}
                    </p>
                    {displayStatus === 'live' && displayTime ? (
                      <p className="text-sm font-semibold text-[var(--text-strong)]">{displayTime}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-2xl font-black uppercase tracking-[0.28em] text-[var(--text-strong)] sm:text-3xl">VS</p>
                )}
              </div>

              <div className="min-w-0 p-2 text-center">
                <div className="mx-auto mb-2 w-fit">
                  {awayTeam ? <FlagAvatar team={awayTeam} className="h-14 w-14" /> : <span className="block h-14 w-14 rounded-full border border-[var(--border)]" aria-hidden="true" />}
                </div>
                <p className="flex items-center justify-center gap-1.5 text-base font-semibold text-[var(--text-strong)] sm:text-lg">
                  <span className={`truncate ${awayWon ? 'text-[var(--accent-text)]' : ''}`.trim()}>{awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : 'TBD'}</span>
                  {awayIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{awayTeam?.code ?? 'TBD'}</p>
              </div>
            </div>
          </div>

          {isPredictionOpen ? (
            <div className="space-y-3 border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                  {locale === 'fr' ? 'Pronostic' : 'Prediction'}
                </p>
                {user && hasPredictionChanges ? (
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
                      className="border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
                    >
                      {locale === 'fr' ? 'Annuler' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={isSavingPrediction || !effectiveOutcome}
                      onClick={() => {
                        void submitPrediction()
                      }}
                      className="bg-[var(--accent-muted)] px-3 py-1 text-sm font-semibold text-[var(--accent-text)] disabled:opacity-50"
                    >
                      {locale === 'fr' ? 'Enregistrer' : 'Save'}
                    </button>
                  </div>
                ) : null}
              </div>

              {!user ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {quickOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => openAuthModal('login')}
                        className="px-2 py-2 text-xs font-semibold text-[var(--text)] sm:text-sm bg-[var(--surface-soft)]"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {locale === 'fr' ? 'Connecte-toi pour enregistrer un pronostic.' : 'Sign in to save a prediction.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {quickOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isSavingPrediction}
                        onClick={() => {
                          setDraftMatchId(match.id)
                          setSelectedOutcome(option.value)
                          setScoreInput({ home: '', away: '' })
                          setIsDraftDirty(true)
                        }}
                        className={`px-2 py-2 text-xs font-semibold sm:text-sm ${
                          draftOutcome === option.value
                            ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]'
                            : 'bg-[var(--surface-soft)] text-[var(--text)]'
                        } disabled:opacity-50`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 items-start gap-2">
                    <input
                      type="number"
                      min={0}
                      value={draftScoreInput.home}
                      onChange={(event) => {
                        const nextScoreInput = { ...draftScoreInput, home: event.target.value }
                        const inferredOutcome = inferOutcomeFromScores(nextScoreInput.home, nextScoreInput.away)
                        setDraftMatchId(match.id)
                        setIsDraftDirty(true)
                        setScoreInput(nextScoreInput)
                        if (inferredOutcome) {
                          setSelectedOutcome(inferredOutcome)
                        }
                      }}
                      placeholder={homeTeam?.code ?? 'HOME'}
                      className="w-full border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-sm"
                    />
                    <span className="self-center text-center text-sm text-[var(--text-muted)]">Scores</span>
                    <input
                      type="number"
                      min={0}
                      value={draftScoreInput.away}
                      onChange={(event) => {
                        const nextScoreInput = { ...draftScoreInput, away: event.target.value }
                        const inferredOutcome = inferOutcomeFromScores(nextScoreInput.home, nextScoreInput.away)
                        setDraftMatchId(match.id)
                        setIsDraftDirty(true)
                        setScoreInput(nextScoreInput)
                        if (inferredOutcome) {
                          setSelectedOutcome(inferredOutcome)
                        }
                      }}
                      placeholder={awayTeam?.code ?? 'AWAY'}
                      className="w-full border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-sm"
                    />
                  </div>

                  {predictionError ? <p className="text-sm text-rose-400">{predictionError}</p> : null}
                </>
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
        </div>
      </div>
    </div>
  )
}
