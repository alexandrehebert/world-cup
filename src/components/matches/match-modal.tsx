import { useEffect } from 'react'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate, getDisplayMatchStatus } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'
import { StatusPill } from '../ui/status-pill'

const stageLabel = (stage: 'group' | 'roundOf32' | 'roundOf16' | 'quarterFinal' | 'semiFinal' | 'final' | 'thirdPlace', labels: ReturnType<typeof useLocale>['t']['labels']) => {
  if (stage === 'group') return labels.stageGroup
  if (stage === 'roundOf32') return labels.stageRoundOf32
  if (stage === 'roundOf16') return labels.stageRoundOf16
  if (stage === 'quarterFinal') return labels.stageQuarterFinal
  if (stage === 'semiFinal') return labels.stageSemiFinal
  if (stage === 'thirdPlace') return labels.stageThirdPlace
  return labels.stageFinal
}

export const MatchModal = () => {
  const { isFavoriteTeam, selectedMatchId, setSelectedMatchId } = useDashboard()
  const { locale, t } = useLocale()
  const { matchesById, teamsById } = useTournament()
  const match = selectedMatchId ? matchesById[selectedMatchId] : undefined

  useEffect(() => {
    if (selectedMatchId && !match) {
      setSelectedMatchId(null)
    }
  }, [match, selectedMatchId, setSelectedMatchId])

  useEffect(() => {
    if (!selectedMatchId || !match) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedMatchId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [selectedMatchId, setSelectedMatchId])

  if (!selectedMatchId || !match) {
    return null
  }
  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
  const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
  const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
  const hasScore = typeof match.home.score === 'number' && typeof match.away.score === 'number'
  const displayStatus = getDisplayMatchStatus(match)
  const homeWon = displayStatus === 'finished' && hasScore && (match.home.score ?? 0) > (match.away.score ?? 0)
  const awayWon = displayStatus === 'finished' && hasScore && (match.away.score ?? 0) > (match.home.score ?? 0)
  const { localDateTime } = formatMatchDate(match.kickoff, locale, undefined, t.labels.today)
  const { localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone, t.labels.today)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onClick={() => setSelectedMatchId(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-modal-title"
        className="w-full max-w-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <h3 id="match-modal-title" className="text-lg font-semibold text-[var(--text-strong)]">
            {t.labels.details}
          </h3>
          <button
            type="button"
            onClick={() => setSelectedMatchId(null)}
            className="text-[var(--text)] transition hover:text-[var(--text-strong)] rounded-full p-1"
            aria-label="Close"
          >
            <Icon name="close" className="text-[24px]" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{t.labels.status}</p>
              <div className="mt-2">
                <StatusPill
                  status={displayStatus}
                  label={
                    displayStatus === 'live'
                      ? t.labels.live
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
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">{displayStatus === 'finished' ? t.labels.finished : t.labels.live}</p>
                  </>
                ) : (
                  <p className="text-2xl font-black uppercase tracking-[0.28em] text-[var(--text-strong)] sm:text-3xl">VS</p>
                )}
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-soft)]">{t.meta.localTime}</p>
                <p className="text-sm font-semibold text-[var(--text-strong)]">{localTime}</p>
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

          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{t.meta.venue}</p>
            <p className="mt-2 text-base font-semibold text-[var(--text-strong)]">{match.venue.stadium}</p>
            <p className="mt-1 text-sm text-[var(--text)]">
              {match.venue.city}, {match.venue.country}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
