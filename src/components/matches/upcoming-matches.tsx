import { useMemo } from 'react'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { useNow, useTimeZone } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { resolveCompetitionId } from '../../competitions'
import { hidesGroupStageLabel } from '../../lib/competition-sections'
import { formatMatchDate, getDisplayMatchStatus, getLocalizedCountryName, getLocalizedText, getMatchDisplayTime, hasDisplayScore } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'
import { StatusPill } from '../ui/status-pill'
import type { MatchRecord } from '../../types/tournament'

const getDateLocale = (locale: ReturnType<typeof useLocale>['locale']) => (locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-GB')

const getMatchDayKey = (kickoff: string, timeZone?: string) => {
  const date = new Date(kickoff)
  const resolvedTimeZone = timeZone ?? 'UTC'

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

  if (stage === 'roundOf32') {
    return labels.stageRoundOf32
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

export const UpcomingMatches = ({ matches, compact = false }: { matches: MatchRecord[]; compact?: boolean }) => {
  const { locale, t } = useLocale()
  const { isFavoriteTeam, favoriteTeamIds, setSelectedTeamId } = useDashboard()
  const { meta, teamsById } = useTournament()
  const competitionId = resolveCompetitionId(meta.competitionId)
  const hideGroupStage = hidesGroupStageLabel(competitionId)
  const nowMs = useNow()
  const localTimeZone = useTimeZone()
  const anyFavoriteVisible = useMemo(
    () => favoriteTeamIds.length > 0 && matches.some((m) => (m.home.teamId && favoriteTeamIds.includes(m.home.teamId)) || (m.away.teamId && favoriteTeamIds.includes(m.away.teamId))),
    [favoriteTeamIds, matches],
  )
  const groupedMatches = useMemo(() => {
    const dateLocale = getDateLocale(locale)
    const groups = new Map<string, { dayLabel: string; matches: MatchRecord[] }>()
    const todayKey = getMatchDayKey(new Date(nowMs).toISOString(), localTimeZone)

    for (const match of matches) {
      const date = new Date(match.kickoff)
      const resolvedTimeZone = match.venue.timeZone ?? localTimeZone
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
  }, [locale, localTimeZone, matches, nowMs, t.labels.today])

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
              const { localDateTime, localTime } = formatMatchDate(match.kickoff, locale, localTimeZone, t.labels.today)
              const minutesUntilKickoff = Math.ceil((new Date(match.kickoff).getTime() - nowMs) / 60000)
              const isVerySoon = match.status === 'scheduled' && minutesUntilKickoff > 0 && minutesUntilKickoff < 60
              const minuteLabel =
                locale === 'fr'
                  ? `dans ${minutesUntilKickoff} ${minutesUntilKickoff === 1 ? 'minute' : 'minutes'}`
                  : `in ${minutesUntilKickoff} ${minutesUntilKickoff === 1 ? 'minute' : 'minutes'}`
              const displayTiming = getMatchDisplayTime(match, t.labels, nowMs, locale)
              const displayDateTime = displayTiming ?? (isVerySoon ? minuteLabel : localDateTime)
              const displayLocalTime = isVerySoon ? minuteLabel : localTime
              const displayStatus = getDisplayMatchStatus(match, nowMs)
              const isLive = displayStatus === 'live'
              const isFinished = displayStatus === 'finished'
              const displayScore = hasDisplayScore(match, nowMs)
              const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
              const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
              const hasFavorite = homeIsFavorite || awayIsFavorite
              const stadiumLabel = getLocalizedText(match.venue.stadium, locale)
              const cityLabel = getLocalizedText(match.venue.city, locale)
              const countryLabel = getLocalizedCountryName(match.venue.country, locale)
              const venueLabel = [stadiumLabel ?? match.venue.stadium, cityLabel, countryLabel].filter((value): value is string => Boolean(value)).join(' · ')
              const matchStageLabel = match.stage === 'group' && hideGroupStage ? null : stageLabel(match.stage, t.labels)

              return (
                <div
                  key={match.id}
                  className={`relative w-full overflow-hidden rounded-[var(--radius-sm)] px-5 py-4 transition ${
                    isFinished
                      ? 'past-match-stripes bg-[var(--surface-soft)] opacity-60 saturate-50'
                      : hasFavorite
                        ? 'bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)]'
                        : isLive
                          ? 'bg-[var(--calendar-live-bg)] hover:bg-[var(--calendar-live-hover-bg)]'
                        : anyFavoriteVisible
                         ? 'bg-[var(--surface)] hover:bg-[var(--surface-soft)]'
                         : 'bg-[var(--surface)] hover:bg-[var(--surface-soft)]'
                  } ${hasFavorite ? 'border-l-4 border-l-[var(--accent)]' : ''}`}
                >
                  <div className="flex w-full flex-col gap-4 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {matchStageLabel ? (
                          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                            {matchStageLabel}
                          </p>
                        ) : null}
                        <p className={`${compact ? 'mt-1 text-sm' : 'mt-1 text-base'} font-semibold text-[var(--text-strong)]`}>{displayDateTime}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusPill status={displayStatus} label={statusLabel(displayStatus, t.labels)} />
                        <Icon name="chevron_right" className="text-[20px] text-[var(--text-muted)]" />
                      </div>
                    </div>

                    <div className="flex flex-nowrap items-center gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
                      <div className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
                        {homeTeam && <FlagAvatar team={homeTeam} className="h-6 w-6 sm:h-12 sm:w-12" />}
                        <div className="min-w-0">
                          {homeTeam ? (
                            <button
                              type="button"
                              onClick={() => setSelectedTeamId(homeTeam.id)}
                              className="inline-flex max-w-full cursor-pointer items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--text-strong)] hover:text-[var(--accent-text)] hover:underline"
                            >
                              <span>{t.teams[homeTeam.id] ?? homeTeam.name}</span>
                              {homeIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                            </button>
                          ) : (
                            <p className="inline-flex max-w-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--text-strong)]">
                              <span>TBD</span>
                            </p>
                          )}
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
                          {awayTeam ? (
                            <button
                              type="button"
                              onClick={() => setSelectedTeamId(awayTeam.id)}
                              className="inline-flex max-w-full cursor-pointer items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--text-strong)] hover:text-[var(--accent-text)] hover:underline"
                            >
                              <span>{t.teams[awayTeam.id] ?? awayTeam.name}</span>
                              {awayIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                            </button>
                          ) : (
                            <p className="inline-flex max-w-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--text-strong)]">
                              <span>TBD</span>
                            </p>
                          )}
                          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                            {awayTeam?.code ?? 'TBD'}
                          </p>
                        </div>
                        {awayTeam && <FlagAvatar team={awayTeam} className="order-1 h-6 w-6 sm:order-2 sm:h-12 sm:w-12" />}
                      </div>
                    </div>

                    <div>
                      <p className={compact ? 'text-xs text-[var(--text-soft)]' : 'text-sm text-[var(--text-soft)]'}>
                        {t.meta.localTime} · {displayLocalTime}
                      </p>
                      <p className={compact ? 'text-xs text-[var(--text-soft)]' : 'text-sm text-[var(--text-soft)]'}>
                        {venueLabel}
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
