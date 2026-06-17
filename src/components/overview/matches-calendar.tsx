import { useMemo, useState } from 'react'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { useNow } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { getDisplayMatchStatus, getMatchDisplayTime, hasDisplayScore } from '../../lib/format'
import { FlagAvatar } from '../ui/flag-avatar'
import { Icon } from '../../lib/icons'
import { LivePulse } from '../ui/live-pulse'
import type { MatchRecord } from '../../types/tournament'

const getDateLocale = (locale: ReturnType<typeof useLocale>['locale']) => (locale === 'fr' ? 'fr-FR' : 'en-GB')

const startOfIsoWeekUtc = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() - (day - 1))
  return utcDate
}

const getDateParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  })

  const parts = formatter.formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0')
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '0')
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '0')

  return { year, month, day }
}

const toMonthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`
const toDayKey = (year: number, month: number, day: number) => `${toMonthKey(year, month)}-${String(day).padStart(2, '0')}`

const statusBadgeClass: Record<MatchRecord['status'], string> = {
  scheduled: 'bg-[var(--surface-strong)] text-[var(--text-soft)] hover:bg-[var(--calendar-scheduled-hover-bg)]',
  live: 'bg-[var(--surface-strong)] text-[var(--text-soft)] hover:bg-[var(--calendar-scheduled-hover-bg)]',
  finished: 'past-match-stripes bg-[var(--surface-soft)] opacity-60 saturate-50 text-[var(--text-muted)] hover:bg-[var(--calendar-finished-hover-bg)]',
}

const scoreLabel = (match: MatchRecord, nowMs: number) => {
  if (hasDisplayScore(match, nowMs)) {
    return `${match.home.score}-${match.away.score}`
  }

  return 'vs'
}

export const MatchesCalendar = ({ matches }: { matches: MatchRecord[] }) => {
  const { isFavoriteTeam, setSelectedMatchId } = useDashboard()
  const { locale, t } = useLocale()
  const { teamsById } = useTournament()
  const nowMs = useNow()
  const dateLocale = getDateLocale(locale)
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const calendarData = useMemo(() => {
    const byDay = new Map<string, MatchRecord[]>()

    for (const match of matches) {
      const date = new Date(match.kickoff)
      const timeZone = match.venue.timeZone ?? 'UTC'
      const { year, month, day } = getDateParts(date, timeZone)
      const dayKey = toDayKey(year, month, day)
      const existing = byDay.get(dayKey)

      if (existing) {
        existing.push(match)
      } else {
        byDay.set(dayKey, [match])
      }
    }

    const monthKeys = [...new Set([...byDay.keys()].map((dayKey) => dayKey.slice(0, 7)))].sort((a, b) =>
      a.localeCompare(b),
    )

    return { byDay, monthKeys }
  }, [matches])

  const tournamentStartWeek = useMemo(() => {
    if (matches.length === 0) {
      return null
    }

    let earliestKickoff = Number.POSITIVE_INFINITY

    for (const match of matches) {
      const kickoffTime = new Date(match.kickoff).getTime()
      if (Number.isFinite(kickoffTime) && kickoffTime < earliestKickoff) {
        earliestKickoff = kickoffTime
      }
    }

    if (!Number.isFinite(earliestKickoff)) {
      return null
    }

    return startOfIsoWeekUtc(new Date(earliestKickoff))
  }, [matches])

  const todayParts = getDateParts(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone)
  const todayMonthKey = toMonthKey(todayParts.year, todayParts.month)
  const fallbackIndex = calendarData.monthKeys.length > 0 ? 0 : -1
  const initialIndex = Math.max(calendarData.monthKeys.indexOf(todayMonthKey), fallbackIndex)
  const [activeMonthIndex, setActiveMonthIndex] = useState(initialIndex)

  if (calendarData.monthKeys.length === 0 || activeMonthIndex < 0) {
    return (
      <div className="bg-[var(--surface)] px-6 py-8 text-sm text-[var(--text-muted)]">
        No matches available.
      </div>
    )
  }

  const monthKey = calendarData.monthKeys[activeMonthIndex]
  const [yearText, monthText] = monthKey.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const monthDate = new Date(Date.UTC(year, month - 1, 1))
  const monthLabel = new Intl.DateTimeFormat(dateLocale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthDate)

  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const weekdayDate = new Date(Date.UTC(2024, 0, index + 1))
    return new Intl.DateTimeFormat(dateLocale, {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(weekdayDate)
  })

  const firstWeekday = (monthDate.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: Array<{ day: number; matches: MatchRecord[] } | null> = []

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayKey = toDayKey(year, month, day)
    cells.push({ day, matches: calendarData.byDay.get(dayKey) ?? [] })
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const weekLabelPrefix = locale === 'fr' ? 'Semaine du tournoi' : 'Tournament Week'

  const monthAgendaItems: Array<
    | { type: 'separator'; key: string; weekNumber: number }
    | { type: 'day'; key: string; day: number; matches: MatchRecord[] }
  > = []

  for (let weekStart = 0; weekStart < cells.length; weekStart += 7) {
    const weekCells = cells.slice(weekStart, weekStart + 7)
    const firstDayCell = weekCells.find((cell): cell is { day: number; matches: MatchRecord[] } => Boolean(cell))
    const hasMatchesInWeek = weekCells.some((cell) => Boolean(cell && cell.matches.length > 0))

    if (!firstDayCell || !hasMatchesInWeek) {
      continue
    }

    const weekDate = new Date(Date.UTC(year, month - 1, firstDayCell.day))
    const weekStartDate = startOfIsoWeekUtc(weekDate)
    const weekNumber = tournamentStartWeek
      ? Math.floor((weekStartDate.getTime() - tournamentStartWeek.getTime()) / 604800000) + 1
      : 1

    if (weekNumber < 1) {
      continue
    }

    monthAgendaItems.push({
      type: 'separator',
      key: `${monthKey}-week-${weekNumber}-${weekStart}`,
      weekNumber,
    })

    for (const dayCell of weekCells) {
      if (!dayCell || dayCell.matches.length === 0) {
        continue
      }

      monthAgendaItems.push({
        type: 'day',
        key: `${monthKey}-mobile-${dayCell.day}`,
        day: dayCell.day,
        matches: dayCell.matches,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[var(--surface)] px-4 py-3">
        <button
          type="button"
          onClick={() => setActiveMonthIndex((current) => Math.max(0, current - 1))}
          disabled={activeMonthIndex === 0}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="chevron_left" className="text-[18px]" />
          <span>{t.labels.previous}</span>
        </button>
        <h3 className="text-lg font-semibold capitalize text-[var(--text-strong)]">{monthLabel}</h3>
        <button
          type="button"
          onClick={() => setActiveMonthIndex((current) => Math.min(calendarData.monthKeys.length - 1, current + 1))}
          disabled={activeMonthIndex === calendarData.monthKeys.length - 1}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>{t.labels.next}</span>
          <Icon name="chevron_right" className="text-[18px]" />
        </button>
      </div>

      <div className="hidden xl:grid xl:grid-cols-7">
        {weekdays.map((weekday) => (
          <div
            key={weekday}
            className="-ml-px -mt-px border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]"
          >
            {weekday}
          </div>
        ))}
        {cells.map((cell, index) => (
          <div
            key={`${monthKey}-cell-${index}`}
            className={`min-h-40 p-2 align-top ${
              cell
                ? '-ml-px -mt-px border border-[var(--border)] bg-[var(--surface)]'
                : 'bg-[color:color-mix(in_srgb,var(--surface)_42%,transparent)]'
            }`}
          >
            {cell ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--text-soft)]">{cell.day}</p>
                <div className="space-y-1.5">
                  {cell.matches.map((match) => {
                    const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                    const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                    const homeScore = typeof match.home.score === 'number' ? match.home.score : null
                    const awayScore = typeof match.away.score === 'number' ? match.away.score : null
                    const displayStatus = getDisplayMatchStatus(match, nowMs)
                    const isFinished = displayStatus === 'finished'
                    const homeWon = isFinished && homeScore !== null && awayScore !== null && homeScore > awayScore
                    const awayWon = isFinished && homeScore !== null && awayScore !== null && awayScore > homeScore
                    const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
                    const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
                    const hasFavorite = homeIsFavorite || awayIsFavorite
                    const kickoffTime = new Intl.DateTimeFormat(dateLocale, {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: localTimeZone,
                    }).format(new Date(match.kickoff))
                    const displayTiming = getMatchDisplayTime(match, t.labels, nowMs, locale)
                    const cardClassName = isFinished
                      ? statusBadgeClass.finished
                      : hasFavorite
                        ? 'bg-[var(--accent-muted)] hover:bg-[var(--calendar-favorite-hover-bg)]'
                        : statusBadgeClass[displayStatus]
                    const borderClassName = hasFavorite
                      ? 'border-l-4 border-l-[var(--accent)]'
                      : displayStatus === 'live'
                        ? 'border-l-2 border-l-[var(--accent)]'
                        : ''

                    return (
                      <button type="button" key={match.id} onClick={() => setSelectedMatchId(match.id)} className={`calendar-match-card w-full cursor-pointer space-y-1 px-2 py-1.5 text-left text-xs transition hover:opacity-100 focus:outline-none focus-visible:outline-none ${cardClassName} ${borderClassName}`}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-[var(--text-strong)]">
                            {homeTeam ? <FlagAvatar team={homeTeam} className="h-4 w-4" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)]" aria-hidden="true" />}
                            <span className={homeWon ? 'text-[var(--accent-text)]' : ''}>{homeTeam ? homeTeam.code : 'TBD'}</span>
                          </span>
                          <span className="font-semibold text-[var(--text-strong)]">{scoreLabel(match, nowMs)}</span>
                          <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-[var(--text-strong)]">
                            <span className={awayWon ? 'text-[var(--accent-text)]' : ''}>{awayTeam ? awayTeam.code : 'TBD'}</span>
                            {awayTeam ? <FlagAvatar team={awayTeam} className="h-4 w-4" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)]" aria-hidden="true" />}
                          </span>
                        </div>
                        <p className="inline-flex items-center gap-1">
                          {displayStatus === 'live' ? <LivePulse className="h-2.5 w-2.5" /> : null}
                          <span>{displayTiming ?? kickoffTime}</span>
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 xl:hidden">
        {monthAgendaItems.map((item) => {
          if (item.type === 'separator') {
            return (
              <div
                key={item.key}
                  className="border-y border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 md:col-span-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    {weekLabelPrefix} {item.weekNumber}
                </p>
              </div>
            )
          }

          const dayDate = new Date(Date.UTC(year, month - 1, item.day))
          const dayLabel = new Intl.DateTimeFormat(dateLocale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'UTC',
          }).format(dayDate)
          const isToday = year === todayParts.year && month === todayParts.month && item.day === todayParts.day

          return (
            <section key={item.key} className="bg-[var(--surface)] p-3">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
                {isToday ? (
                  <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] tracking-[0.12em] text-[var(--accent-text)]">
                    {t.labels.today}
                  </span>
                ) : null}
                <span>{dayLabel}</span>
              </h4>
              <div className="space-y-2">
                {item.matches.map((match) => {
                  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                  const homeScore = typeof match.home.score === 'number' ? match.home.score : null
                  const awayScore = typeof match.away.score === 'number' ? match.away.score : null
                  const displayStatus = getDisplayMatchStatus(match, nowMs)
                  const isFinished = displayStatus === 'finished'
                  const homeWon = isFinished && homeScore !== null && awayScore !== null && homeScore > awayScore
                  const awayWon = isFinished && homeScore !== null && awayScore !== null && awayScore > homeScore
                  const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
                  const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
                  const hasFavorite = homeIsFavorite || awayIsFavorite
                  const kickoffTime = new Intl.DateTimeFormat(dateLocale, {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: localTimeZone,
                  }).format(new Date(match.kickoff))
                  const minutesUntilKickoff = Math.ceil((new Date(match.kickoff).getTime() - nowMs) / 60000)
                  const isVerySoon =
                    match.status === 'scheduled' &&
                    minutesUntilKickoff > 0 &&
                    minutesUntilKickoff < 60
                  const minuteLabel =
                    locale === 'fr'
                      ? `dans ${minutesUntilKickoff} ${minutesUntilKickoff === 1 ? 'minute' : 'minutes'}`
                      : `in ${minutesUntilKickoff} ${minutesUntilKickoff === 1 ? 'minute' : 'minutes'}`
                  const displayTiming = getMatchDisplayTime(match, t.labels, nowMs, locale)
                  const footerValue = displayTiming ?? (isVerySoon ? minuteLabel : kickoffTime)
                  const footerStatus =
                    displayStatus === 'finished'
                      ? t.labels.finished
                      : displayStatus === 'live'
                        ? t.labels.live
                        : t.labels.scheduled
                  const cardClassName = isFinished
                    ? statusBadgeClass.finished
                    : hasFavorite
                      ? 'bg-[var(--accent-muted)] hover:bg-[var(--calendar-favorite-hover-bg)]'
                      : statusBadgeClass[displayStatus]
                  const borderClassName = hasFavorite
                    ? 'border-l-4 border-l-[var(--accent)]'
                    : displayStatus === 'live'
                      ? 'border-l-2 border-l-[var(--accent)]'
                      : ''

                  return (
                    <button type="button" key={match.id} onClick={() => setSelectedMatchId(match.id)} className={`calendar-match-card flex w-full cursor-pointer flex-col items-center gap-2 px-2 py-2 text-xs transition hover:opacity-100 focus:outline-none focus-visible:outline-none md:items-stretch ${cardClassName} ${borderClassName}`}>
                      <div className="flex w-full items-center justify-center gap-2 font-semibold text-[var(--text-strong)] md:justify-between">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          {homeTeam ? <FlagAvatar team={homeTeam} className="h-5 w-5" /> : <span className="h-5 w-5 shrink-0 rounded-full border border-[var(--border)]" aria-hidden="true" />}
                          <span className={`truncate ${homeWon ? 'text-[var(--accent-text)]' : ''}`.trim()}>{homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : 'TBD'}</span>
                        </span>
                        <span>{scoreLabel(match, nowMs)}</span>
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <span className={`truncate ${awayWon ? 'text-[var(--accent-text)]' : ''}`.trim()}>{awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : 'TBD'}</span>
                          {awayTeam ? <FlagAvatar team={awayTeam} className="h-5 w-5" /> : <span className="h-5 w-5 shrink-0 rounded-full border border-[var(--border)]" aria-hidden="true" />}
                        </span>
                      </div>
                      <div className="space-y-0.5 text-center">
                        <p>{footerValue}</p>
                        <p className="inline-flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          {displayStatus === 'live' ? <LivePulse className="h-2.5 w-2.5" /> : null}
                          <span>{footerStatus}</span>
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
