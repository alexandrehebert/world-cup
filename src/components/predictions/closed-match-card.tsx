import { useLocale } from '../../contexts/locale-context'
import { usePredictions } from '../../contexts/predictions-context'
import { useTimeZone } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { getActualOutcome, getClosedButtonClass } from '../predictions/prediction-form'
import type { MatchRecord } from '../../types/tournament'

interface Props {
  match: MatchRecord
}

const STATUS_ICON = { successful: 'check_circle', pending: 'schedule', unsuccessful: 'cancel', live: 'sports_soccer' } as const
const STATUS_CLASS = {
  successful: 'bg-emerald-500/20 text-emerald-400',
  pending: 'bg-[var(--surface-soft)] text-[var(--text-muted)]',
  unsuccessful: 'bg-rose-500/20 text-rose-400',
  live: 'bg-amber-500/20 text-amber-400',
} as const

export const ClosedMatchCard = ({ match }: Props) => {
  const { locale, t } = useLocale()
  const timeZone = useTimeZone()
  const { teamsById } = useTournament()
  const { predictionsByMatch } = usePredictions()

  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
  const homeLabel = homeTeam ? (t.teams[homeTeam.id] ?? homeTeam.name) : t.labels.tbd
  const awayLabel = awayTeam ? (t.teams[awayTeam.id] ?? awayTeam.name) : t.labels.tbd

  const prediction = predictionsByMatch[match.id]
  const { localDateTime } = formatMatchDate(match.kickoff, locale, timeZone, t.labels.today)

  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'
  const hasScore = match.home.score !== undefined && match.away.score !== undefined
  const actualOutcome = getActualOutcome(match.home.score, match.away.score, match.status, match.home.penaltyScore, match.away.penaltyScore)
  const isScored = Boolean(prediction?.scoredAt)
  const isCorrect = isScored && (prediction?.pointsAwarded ?? 0) > 0

  const persistedHomeScore = prediction?.type === 'score' && prediction.homeScore !== undefined ? String(prediction.homeScore) : ''
  const persistedAwayScore = prediction?.type === 'score' && prediction.awayScore !== undefined ? String(prediction.awayScore) : ''
  const hasPersistedScores = persistedHomeScore.length > 0 || persistedAwayScore.length > 0

  const predictionStatus = prediction
    ? prediction.scoredAt ? (prediction.pointsAwarded > 0 ? 'successful' : 'unsuccessful') : isLive ? 'live' : 'pending'
    : null

  const statusTitle = {
    successful: t.labels.predictionSuccessful,
    pending: t.labels.predictionPending,
    unsuccessful: t.labels.predictionUnsuccessful,
    live: t.labels.predictionLive,
  } as const

  const finishedBorderClass = isFinished && predictionStatus === 'successful'
    ? 'border-l-2 border-l-emerald-500'
    : isFinished && predictionStatus === 'unsuccessful'
      ? 'border-l-2 border-l-rose-500'
      : ''

  const scoreColorClass = isFinished
    ? predictionStatus === 'successful' ? 'text-emerald-400' : predictionStatus === 'unsuccessful' ? 'text-rose-400' : 'text-[var(--text-muted)]'
    : 'text-[var(--text-muted)]'

  return (
    <article className={`space-y-3 border border-[var(--border)] bg-[var(--surface)] p-4 opacity-90 ${finishedBorderClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--text-strong)]">{homeLabel} vs {awayLabel}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {localDateTime}
            {(isFinished || isLive) && hasScore ? (
              <span className={`ml-2 font-semibold ${isLive ? 'text-amber-400' : 'text-[var(--text)]'}`}>
                {match.home.score} – {match.away.score}
                {isLive && match.live?.shortDetail ? (
                  <span className="ml-1 text-[0.65rem] font-normal opacity-70">{match.live.shortDetail}</span>
                ) : null}
              </span>
            ) : null}
          </p>
        </div>
        {predictionStatus ? (
          <span
            title={statusTitle[predictionStatus]}
            className={`inline-flex shrink-0 items-center justify-center rounded-full ${STATUS_CLASS[predictionStatus]} ${predictionStatus === 'live' ? 'animate-pulse' : ''} ${isFinished ? 'h-6 w-6' : 'h-5 w-5'}`}
          >
            <Icon name={STATUS_ICON[predictionStatus]} className={`leading-none ${isFinished ? 'text-base' : 'text-sm'}`} />
          </span>
        ) : null}
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
              disabled
              className={`w-full cursor-not-allowed px-2 py-2 text-xs font-semibold sm:text-sm ${getClosedButtonClass(item.value, prediction?.outcome, actualOutcome, isScored, isCorrect, isLive)}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {hasPersistedScores ? (
          <div className="space-y-1">
            <div className="grid h-9 grid-cols-3 items-center gap-2">
              <div className={`flex h-full items-center justify-center border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-center text-sm font-semibold ${scoreColorClass}`}>
                {persistedHomeScore}
              </div>
              <span className={`self-center text-center text-xs font-medium ${scoreColorClass}`}>{t.labels.yourPrediction}</span>
              <div className={`flex h-full items-center justify-center border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-center text-sm font-semibold ${scoreColorClass}`}>
                {persistedAwayScore}
              </div>
            </div>
            {isFinished && hasScore ? (
              <div className="grid h-9 grid-cols-3 items-center gap-2">
                <div className="flex h-full items-center justify-center border border-[var(--border)] bg-transparent px-2 py-1 text-center text-sm font-semibold text-[var(--text)]">
                  {match.home.score}
                </div>
                <span className="self-center text-center text-xs text-[var(--text-muted)]">{t.labels.finalScore}</span>
                <div className="flex h-full items-center justify-center border border-[var(--border)] bg-transparent px-2 py-1 text-center text-sm font-semibold text-[var(--text)]">
                  {match.away.score}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
