import { useLocale } from '../../contexts/locale-context'
import { usePredictions } from '../../contexts/predictions-context'
import { useNow } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { inferOutcomeFromScores } from '../../lib/predictions'
import type { MatchRecord } from '../../types/tournament'
import type { PredictionDraftState } from './use-prediction-drafts'

interface Props {
  match: MatchRecord
  drafts: PredictionDraftState
}

const STATUS_ICON = { successful: 'check_circle', pending: 'schedule', unsuccessful: 'cancel' } as const
const STATUS_CLASS = {
  successful: 'bg-[var(--accent-muted)] text-[var(--accent-text)]',
  pending: 'bg-[var(--surface-soft)] text-[var(--text-muted)]',
  unsuccessful: 'bg-[var(--surface-soft)] text-rose-400',
} as const

export const OpenMatchCard = ({ match, drafts }: Props) => {
  const { locale, t } = useLocale()
  const { teamsById } = useTournament()
  const { predictionsByMatch, predictionDistributionsByMatch, savingMatchId } = usePredictions()
  const nowMs = useNow()

  const {
    selectedOutcomes, scoreInputs, scoreFieldsVisibleByMatch, dirtyMatches,
    predictionError, setSelectedOutcomes, setScoreInputs, setScoreFieldsVisibleByMatch,
    setDirtyMatches, setPredictionError, submitPrediction,
  } = drafts

  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
  const homeLabel = homeTeam ? (t.teams[homeTeam.id] ?? homeTeam.name) : t.labels.tbd
  const awayLabel = awayTeam ? (t.teams[awayTeam.id] ?? awayTeam.name) : t.labels.tbd

  const prediction = predictionsByMatch[match.id]
  const distribution = predictionDistributionsByMatch[match.id] ?? {
    matchId: match.id, homeCount: 0, drawCount: 0, awayCount: 0, totalPredictions: 0,
  }
  const total = distribution.totalPredictions
  const homeShare = total > 0 ? distribution.homeCount / total : 0
  const drawShare = total > 0 ? distribution.drawCount / total : 0
  const awayShare = total > 0 ? distribution.awayCount / total : 0
  const maxShare = Math.max(homeShare, drawShare, awayShare)
  const dominantOutcome = maxShare === 0 ? 'neutral' : homeShare === maxShare ? 'home' : drawShare === maxShare ? 'draw' : 'away'
  const heatColor = { home: 'rgb(52 211 153)', draw: 'rgb(168 162 158)', away: 'rgb(56 189 248)', neutral: 'rgb(161 161 170)' } as const
  const heatOpacity = total > 0 ? 0.25 + maxShare * 0.55 : 0.2
  const trendPos = Math.round((drawShare * 50 + awayShare * 100) * 10) / 10
  const trendTooltip = `${homeLabel}: ${Math.round(homeShare * 100)}% • ${t.labels.draw}: ${Math.round(drawShare * 100)}% • ${awayLabel}: ${Math.round(awayShare * 100)}%`

  const { localDateTime } = formatMatchDate(match.kickoff, locale, Intl.DateTimeFormat().resolvedOptions().timeZone, t.labels.today)
  const isSaving = savingMatchId === match.id
  const isPredictionClosed = new Date(match.kickoff).getTime() <= nowMs

  const persistedOutcome = prediction?.outcome
  const persistedHomeScore = prediction?.type === 'score' && prediction.homeScore !== undefined ? String(prediction.homeScore) : ''
  const persistedAwayScore = prediction?.type === 'score' && prediction.awayScore !== undefined ? String(prediction.awayScore) : ''
  const selectedOutcome = selectedOutcomes[match.id] ?? persistedOutcome
  const scoreInput = scoreInputs[match.id] ?? { home: persistedHomeScore, away: persistedAwayScore }
  const draftHome = scoreInput.home.trim()
  const draftAway = scoreInput.away.trim()
  const hasPersistedScores = persistedHomeScore.length > 0 || persistedAwayScore.length > 0
  const isScoreVisible = scoreFieldsVisibleByMatch[match.id] ?? (hasPersistedScores || draftHome.length > 0 || draftAway.length > 0)

  const activeIssue = predictionError?.matchId === match.id ? predictionError.issue : undefined
  const isOutcomeInvalid = activeIssue === 'outcome' && !selectedOutcome
  const isScoresInvalid = activeIssue === 'scores'
  const isHomeScoreInvalid = isScoresInvalid && draftHome.length === 0 && draftAway.length > 0
  const isAwayScoreInvalid = isScoresInvalid && draftAway.length === 0 && draftHome.length > 0

  const hasChanges =
    Boolean(dirtyMatches[match.id]) &&
    ((selectedOutcome ?? null) !== (persistedOutcome ?? null) ||
      draftHome !== persistedHomeScore ||
      draftAway !== persistedAwayScore)

  const predictionStatus = !prediction ? null
    : prediction.scoredAt
      ? prediction.pointsAwarded > 0 ? 'successful' : 'unsuccessful'
      : 'pending'

  const statusTitle = {
    successful: t.labels.predictionSuccessful,
    pending: t.labels.predictionPending,
    unsuccessful: t.labels.predictionUnsuccessful,
  } as const

  const clearErrorIfNeeded = () => {
    if (predictionError?.matchId === match.id) setPredictionError(null)
  }

  return (
    <article className="space-y-3 bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--text-strong)]">{homeLabel} vs {awayLabel}</p>
          <p className="text-xs text-[var(--text-muted)]">{localDateTime}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {predictionStatus && !hasChanges ? (
            <span title={statusTitle[predictionStatus]} className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${STATUS_CLASS[predictionStatus]}`}>
              <Icon name={STATUS_ICON[predictionStatus]} className="text-sm leading-none" />
            </span>
          ) : null}
          {hasChanges ? (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setPredictionError(null)
                  setSelectedOutcomes((curr) => {
                    const next = { ...curr }
                    if (persistedOutcome) next[match.id] = persistedOutcome
                    else delete next[match.id]
                    return next
                  })
                  setScoreInputs((curr) => ({ ...curr, [match.id]: { home: persistedHomeScore, away: persistedAwayScore } }))
                  setDirtyMatches((curr) => ({ ...curr, [match.id]: false }))
                }}
                className="cursor-pointer border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.labels.cancel}
              </button>
              <button
                type="button"
                disabled={isSaving || isPredictionClosed}
                onClick={() => { void submitPrediction(match.id, new Date(match.kickoff).getTime()) }}
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
          {([
            { value: 'home' as const, label: homeLabel },
            { value: 'draw' as const, label: t.labels.draw },
            { value: 'away' as const, label: awayLabel },
          ] as const).map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={isSaving}
              onClick={() => {
                clearErrorIfNeeded()
                if (selectedOutcome === item.value) return
                setSelectedOutcomes((curr) => ({ ...curr, [match.id]: item.value }))
                setScoreInputs((curr) => ({ ...curr, [match.id]: { home: '', away: '' } }))
                setDirtyMatches((curr) => ({ ...curr, [match.id]: true }))
              }}
              className={`w-full cursor-pointer px-2 py-2 text-xs font-semibold transition hover:brightness-105 sm:text-sm ${selectedOutcome === item.value ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]' : 'bg-[var(--surface-soft)] text-[var(--text)]'} ${isOutcomeInvalid ? 'ring-1 ring-rose-400' : ''} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid h-9 grid-cols-3 items-center gap-2">
          {isScoreVisible ? (
            <>
              <input
                type="number"
                min={0}
                value={scoreInput.home}
                onChange={(e) => {
                  clearErrorIfNeeded()
                  const next = { ...scoreInput, home: e.target.value }
                  setScoreInputs((curr) => ({ ...curr, [match.id]: next }))
                  setDirtyMatches((curr) => ({ ...curr, [match.id]: true }))
                  const inferred = inferOutcomeFromScores(next.home, next.away)
                  if (inferred) setSelectedOutcomes((curr) => ({ ...curr, [match.id]: inferred }))
                }}
                placeholder={homeTeam?.code ?? t.labels.home}
                className={`h-full w-full border bg-[var(--surface-strong)] px-2 py-1 text-center text-sm ${isHomeScoreInvalid ? 'border-rose-400 ring-1 ring-rose-400' : 'border-[var(--border)]'}`}
              />
              <span className="self-center text-center text-sm text-[var(--text-muted)]">-</span>
              <input
                type="number"
                min={0}
                value={scoreInput.away}
                onChange={(e) => {
                  clearErrorIfNeeded()
                  const next = { ...scoreInput, away: e.target.value }
                  setScoreInputs((curr) => ({ ...curr, [match.id]: next }))
                  setDirtyMatches((curr) => ({ ...curr, [match.id]: true }))
                  const inferred = inferOutcomeFromScores(next.home, next.away)
                  if (inferred) setSelectedOutcomes((curr) => ({ ...curr, [match.id]: inferred }))
                }}
                placeholder={awayTeam?.code ?? t.labels.away}
                className={`h-full w-full border bg-[var(--surface-strong)] px-2 py-1 text-center text-sm ${isAwayScoreInvalid ? 'border-rose-400 ring-1 ring-rose-400' : 'border-[var(--border)]'}`}
              />
            </>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => { setScoreFieldsVisibleByMatch((curr) => ({ ...curr, [match.id]: true })) }}
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
          <span>{total} {t.labels.players}</span>
        </div>
        <div title={trendTooltip} className="relative h-2 overflow-hidden rounded bg-[var(--surface-soft)]">
          <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--text-muted)]/40" />
          {total > 0 ? (
            <>
              <span aria-hidden className="absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[10px]" style={{ left: `${trendPos}%`, backgroundColor: heatColor[dominantOutcome], opacity: heatOpacity }} />
              <span aria-hidden className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--surface)]" style={{ left: `${trendPos}%`, backgroundColor: heatColor[dominantOutcome] }} />
            </>
          ) : null}
        </div>
      </div>
    </article>
  )
}
