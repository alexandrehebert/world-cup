import { useMemo } from 'react'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate, getLocalizedText } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'
import { StatusPill } from '../ui/status-pill'
import type { MatchRecord } from '../../types/tournament'

const getDateLocale = (locale: ReturnType<typeof useLocale>['locale']) => (locale === 'fr' ? 'fr-FR' : 'en-GB')

const getMatchDayKey = (kickoff: string, timeZone?: string) => {
  const date = new Date(kickoff)
  const resolvedTimeZone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: resolvedTimeZone,
  }).format(date)
}

const statusLabel = (status: MatchRecord['status'], labels: ReturnType<typeof useLocale>['t']['labels']) => {
  if (status === 'live') {
    return labels.live
  }

  if (status === 'finished') {
    return labels.finished
  }

  return labels.scheduled
}

const stageLabel = (stage: MatchRecord['stage'], labels: ReturnType<typeof useLocale>['t']['labels']) => {
  if (stage === 'group') {
    return labels.stageGroup
  }

  if (stage === 'roundOf16') {
    return labels.stageRoundOf16
  }

  if (stage === 'quarterFinal') {
    return labels.stageQuarterFinal
  }

  if (stage === 'semiFinal') {
    return labels.stageSemiFinal
  }

  if (stage === 'thirdPlace') {
    return labels.stageThirdPlace
  }

  return labels.stageFinal
}

const hasScore = (match: MatchRecord) =>
  Number.isFinite(match.home.score) && Number.isFinite(match.away.score)

export const UpcomingMatches = ({ matches, compact = false }: { matches: MatchRecord[]; compact?: boolean }) => {
  const { locale, t } = useLocale()
  const { isFavoriteTeam } = useDashboard()
  const { teamsById } = useTournament()
  const groupedMatches = useMemo(() => {
    const dateLocale = getDateLocale(locale)
    const groups = new Map<string, { dayLabel: string; matches: MatchRecord[] }>()
    const todayKey = getMatchDayKey(new Date().toISOString())

    for (const match of matches) {
      const date = new Date(match.kickoff)
      const resolvedTimeZone = match.venue.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
      const dayKey = getMatchDayKey(match.kickoff, match.venue.timeZone)
      const existingGroup = groups.get(dayKey)

      if (existingGroup) {
        existingGroup.matches.push(match)
        continue
      }

      groups.set(dayKey, {
        dayLabel: dayKey === todayKey
          ? t.labels.today
          : new Intl.DateTimeFormat(dateLocale, {
              dateStyle: 'full',
              timeZone: resolvedTimeZone,
            }).format(date),
        matches: [match],
      })
    }

    return [...groups.values()]
  }, [locale, matches, t.labels.today])

  return (
    <div className="space-y-6">
      {groupedMatches.map((group) => (
        <section key={group.dayLabel}>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]">{group.dayLabel}</p>
            <span className="flex-1 border-t border-[var(--border)]" />
          </div>
          <div className={`grid grid-cols-1 gap-3 ${compact ? 'lg:grid-cols-2' : 'xl:grid-cols-2'}`}>
            {group.matches.map((match) => {
              const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
              const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
              const { localDateTime, localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone, t.labels.today)
              const isLive = match.status === 'live'
              const isFinished = match.status === 'finished'
              const displayScore = hasScore(match)
              const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
              const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
              const hasFavorite = homeIsFavorite || awayIsFavorite

              return (
                <div
                  key={match.id}
                  className={`relative w-full px-5 py-4 transition ${
                    isFinished
                      ? 'bg-[var(--surface-soft)] opacity-70 saturate-50'
                      : hasFavorite
                        ? 'bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)]'
                        : 'bg-[var(--surface)] hover:bg-[var(--surface-strong)]'
                  } ${isLive || hasFavorite ? 'border-l-2 border-l-[var(--accent)]' : ''}`}
                >
                  <div className="flex w-full flex-col gap-4 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                          {stageLabel(match.stage, t.labels)}
                        </p>
                        <p className={`${compact ? 'mt-1 text-sm' : 'mt-1 text-base'} font-semibold text-[var(--text-strong)]`}>{localDateTime}</p>
                      </div>
                      <StatusPill status={match.status} label={statusLabel(match.status, t.labels)} />
                    </div>

                    <div className="flex flex-nowrap items-center gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
                      <div className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
                        {homeTeam && <FlagAvatar team={homeTeam} className="h-6 w-6 sm:h-12 sm:w-12" />}
                        <div className="min-w-0">
                          <p className="inline-flex max-w-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--text-strong)]">
                            <span>{homeTeam ? getLocalizedText(homeTeam.name, locale) : 'TBD'}</span>
                            {homeIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                          </p>
                          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                            {homeTeam?.code ?? 'TBD'}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 px-2 py-1 text-center sm:px-3">
                        {displayScore ? (
                          <p className="text-base font-semibold text-[var(--text-strong)] sm:text-lg">
                            {match.home.score} - {match.away.score}
                          </p>
                        ) : (
                          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-soft)]">vs</p>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                        <div className="order-2 min-w-0 text-right sm:order-1">
                          <p className="inline-flex max-w-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--text-strong)]">
                            <span>{awayTeam ? getLocalizedText(awayTeam.name, locale) : 'TBD'}</span>
                            {awayIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                          </p>
                          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                            {awayTeam?.code ?? 'TBD'}
                          </p>
                        </div>
                        {awayTeam && <FlagAvatar team={awayTeam} className="order-1 h-6 w-6 sm:order-2 sm:h-12 sm:w-12" />}
                      </div>
                    </div>

                    <div>
                      <p className={compact ? 'text-xs text-[var(--text-soft)]' : 'text-sm text-[var(--text-soft)]'}>
                        {t.meta.localTime} · {localTime}
                      </p>
                      <p className={compact ? 'text-xs text-[var(--text-soft)]' : 'text-sm text-[var(--text-soft)]'}>
                        {getLocalizedText(match.venue.stadium, locale)} · {getLocalizedText(match.venue.city, locale)}, {getLocalizedText(match.venue.country, locale)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
