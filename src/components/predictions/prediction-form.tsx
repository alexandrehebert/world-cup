/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import { useLocale } from '../../contexts/locale-context'
import type { MatchOutcome } from '../../types/predictions'

// ── Shared helpers (also used by ClosedMatchCard) ─────────────────────────────

export const getActualOutcome = (
  homeScore: number | undefined,
  awayScore: number | undefined,
  status: string,
): MatchOutcome | null => {
  if (status !== 'finished' && status !== 'live') return null
  if (homeScore === undefined || awayScore === undefined) return null
  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  return 'draw'
}

export const getClosedButtonClass = (
  value: MatchOutcome,
  userPick: MatchOutcome | undefined,
  actualOutcome: MatchOutcome | null,
  isScored: boolean,
  isCorrect: boolean,
  isLive: boolean,
): string => {
  if (userPick === value) {
    if (isLive && actualOutcome !== null) {
      return actualOutcome === value ? 'bg-amber-500/25 text-amber-400' : 'bg-rose-500/20 text-rose-400'
    }
    if (!isScored) return 'bg-[var(--accent-muted)] text-[var(--accent-text)] opacity-70'
    return isCorrect ? 'bg-emerald-500/25 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
  }
  if (isLive && actualOutcome === value) return 'bg-amber-500/10 text-amber-500/60'
  if (actualOutcome === value && isScored && !isCorrect) return 'bg-emerald-500/10 text-emerald-500/60'
  return 'bg-[var(--surface-soft)] text-[var(--text-muted)] opacity-50'
}

// ── Component ─────────────────────────────────────────────────────────────────

interface BaseProps {
  homeLabel: string
  awayLabel: string
  selectedOutcome: MatchOutcome | null
  scoreInput: { home: string; away: string }
  homeOptionIcon?: ReactNode
  awayOptionIcon?: ReactNode
  /** Constrains the score row height and centers text — used in compact card layout. */
  compact?: boolean
}

interface EditableProps extends BaseProps {
  readOnly?: false
  /** When false, shows a "predict scores" toggle button instead of inputs. Defaults to true. */
  isScoreVisible?: boolean
  onOutcomeChange: (outcome: MatchOutcome) => void
  onScoreChange: (score: { home: string; away: string }) => void
  onShowScores?: () => void
  isOutcomeInvalid?: boolean
  isHomeScoreInvalid?: boolean
  isAwayScoreInvalid?: boolean
  isSaving?: boolean
}

interface ReadOnlyProps extends BaseProps {
  readOnly: true
  actualOutcome: MatchOutcome | null
  isLive?: boolean
  isScored?: boolean
  isCorrect?: boolean
}

type Props = EditableProps | ReadOnlyProps

export const PredictionForm = (props: Props) => {
  const { t } = useLocale()
  const { homeLabel, awayLabel, selectedOutcome, scoreInput, compact = false, homeOptionIcon, awayOptionIcon } = props

  const outcomes: Array<{ value: MatchOutcome; label: string; icon?: ReactNode }> = [
    { value: 'home', label: homeLabel, icon: homeOptionIcon },
    { value: 'draw', label: t.labels.draw },
    { value: 'away', label: awayLabel, icon: awayOptionIcon },
  ]

  if (props.readOnly) {
    const { actualOutcome, isLive = false, isScored = false, isCorrect = false } = props
    const hasScores = scoreInput.home !== '' || scoreInput.away !== ''

    return (
      <div className="space-y-2">
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-1"
          role="group"
        >
          {outcomes.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled
              className={`w-full cursor-not-allowed rounded-xl py-2 text-xs font-semibold sm:text-sm ${
                item.value === 'draw' ? 'px-3 sm:px-4' : 'px-2'
              } ${getClosedButtonClass(item.value, selectedOutcome ?? undefined, actualOutcome, isScored, isCorrect, isLive)}`}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                <span className="truncate">{item.label}</span>
              </span>
            </button>
          ))}
        </div>

        {hasScores ? (
          <div className={`grid grid-cols-3 items-center gap-2 ${compact ? 'h-9' : ''}`}>
            <input type="number" readOnly value={scoreInput.home} className={`${compact ? 'h-full' : ''} w-full cursor-not-allowed border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-center text-sm opacity-60`} />
            <span className="self-center text-center text-sm text-[var(--text-muted)]">-</span>
            <input type="number" readOnly value={scoreInput.away} className={`${compact ? 'h-full' : ''} w-full cursor-not-allowed border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-center text-sm opacity-60`} />
          </div>
        ) : null}
      </div>
    )
  }

  const {
    isScoreVisible = true,
    onOutcomeChange,
    onScoreChange,
    onShowScores,
    isOutcomeInvalid = false,
    isHomeScoreInvalid = false,
    isAwayScoreInvalid = false,
    isSaving = false,
  } = props

  return (
    <div className="space-y-2">
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-1 ${
          isOutcomeInvalid ? 'ring-1 ring-rose-400' : ''
        }`}
        role="group"
      >
        {outcomes.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={isSaving}
            onClick={() => onOutcomeChange(item.value)}
            className={`w-full cursor-pointer rounded-xl py-2 text-xs font-semibold transition hover:brightness-105 sm:text-sm ${
              item.value === 'draw' ? 'px-3 sm:px-4' : 'px-2'
            } ${
              selectedOutcome === item.value
                ? 'border border-[var(--tab-active-border)] bg-[var(--tab-active-bg)] text-[var(--tab-active-text)]'
                : 'border border-transparent text-[var(--text)] hover:bg-[var(--tab-idle-hover-bg)]'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-pressed={selectedOutcome === item.value}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              <span className="truncate">{item.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className={`grid grid-cols-3 items-center gap-2 ${compact ? 'h-9' : ''}`}>
        {isScoreVisible ? (
          <>
            <input
              type="number"
              min={0}
              value={scoreInput.home}
              onChange={(e) => onScoreChange({ ...scoreInput, home: e.target.value })}
              placeholder="0"
              className={`${compact ? 'h-full' : ''} w-full border bg-[var(--surface-strong)] px-2 py-1 text-center text-sm ${
                isHomeScoreInvalid ? 'border-rose-400 ring-1 ring-rose-400' : 'border-[var(--border)]'
              }`}
            />
            <span className="self-center text-center text-sm text-[var(--text-muted)]">-</span>
            <input
              type="number"
              min={0}
              value={scoreInput.away}
              onChange={(e) => onScoreChange({ ...scoreInput, away: e.target.value })}
              placeholder="0"
              className={`${compact ? 'h-full' : ''} w-full border bg-[var(--surface-strong)] px-2 py-1 text-center text-sm ${
                isAwayScoreInvalid ? 'border-rose-400 ring-1 ring-rose-400' : 'border-[var(--border)]'
              }`}
            />
          </>
        ) : onShowScores ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={onShowScores}
            className="col-span-3 cursor-pointer justify-self-center bg-transparent p-0 text-xs font-medium text-[var(--text-muted)] underline decoration-1 underline-offset-2 transition hover:text-[var(--text-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.labels.predictScores}
          </button>
        ) : null}
      </div>
    </div>
  )
}
