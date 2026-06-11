import { useEffect } from 'react'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate, getLocalizedText } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'
import { StatusPill } from '../ui/status-pill'

const stageLabel = (stage: 'group' | 'roundOf16' | 'quarterFinal' | 'semiFinal' | 'final' | 'thirdPlace', labels: ReturnType<typeof useLocale>['t']['labels']) => {
  if (stage === 'group') return labels.stageGroup
  if (stage === 'roundOf16') return labels.stageRoundOf16
  if (stage === 'quarterFinal') return labels.stageQuarterFinal
  if (stage === 'semiFinal') return labels.stageSemiFinal
  if (stage === 'thirdPlace') return labels.stageThirdPlace
  return labels.stageFinal
}

export const MatchModal = () => {
  const { selectedMatchId, setSelectedMatchId } = useDashboard()
  const { locale, t } = useLocale()
  const { matchesById, teamsById } = useTournament()

  useEffect(() => {
    if (!selectedMatchId) {
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

  if (!selectedMatchId) {
    return null
  }

  const match = matchesById[selectedMatchId]
  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
  const { localDateTime, localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone)

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

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{t.labels.status}</p>
              <div className="mt-2">
                <StatusPill
                  status={match.status}
                  label={
                    match.status === 'live'
                      ? t.labels.live
                      : match.status === 'finished'
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

          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{stageLabel(match.stage, t.labels)}</p>
            <p className="mt-2 text-sm text-[var(--text)]">{t.meta.localTime} · {localTime}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{t.meta.venue}</p>
            <p className="mt-2 text-base font-semibold text-[var(--text-strong)]">{getLocalizedText(match.venue.stadium, locale)}</p>
            <p className="mt-1 text-sm text-[var(--text)]">
              {getLocalizedText(match.venue.city, locale)}, {getLocalizedText(match.venue.country, locale)}
            </p>
          </div>

          <div className="grid gap-3 pt-1">
            <div className="flex items-center gap-3 border-b border-[var(--border)] py-3">
              {homeTeam && <FlagAvatar team={homeTeam} />}
              <div>
                <p className="font-semibold text-[var(--text-strong)]">{homeTeam ? getLocalizedText(homeTeam.name, locale) : 'TBD'}</p>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{homeTeam?.code ?? 'TBD'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3">
              {awayTeam && <FlagAvatar team={awayTeam} />}
              <div>
                <p className="font-semibold text-[var(--text-strong)]">{awayTeam ? getLocalizedText(awayTeam.name, locale) : 'TBD'}</p>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{awayTeam?.code ?? 'TBD'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
