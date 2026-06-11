import { useMemo, useState } from 'react'
import { useLocale } from '../../contexts/locale-context'
import { useTournament } from '../../contexts/tournament-context'
import { getLocalizedText } from '../../lib/format'
import { FlagAvatar } from '../ui/flag-avatar'
import { Icon } from '../../lib/icons'
import type { MatchRecord } from '../../types/tournament'

const getDateLocale = (locale: ReturnType<typeof useLocale>['locale']) => (locale === 'fr' ? 'fr-FR' : 'en-GB')

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
  scheduled: 'bg-[var(--surface-strong)] text-[var(--text-soft)]',
  live: 'bg-[var(--accent-muted)] text-[var(--accent-text)]',
  finished: 'bg-[var(--surface-soft)] text-[var(--text-muted)] opacity-60 grayscale',
}

const scoreLabel = (match: MatchRecord) => {
  if (typeof match.home.score === 'number' && typeof match.away.score === 'number') {
    return `${match.home.score}-${match.away.score}`
  }

  return 'vs'
}

export const MatchesCalendar = ({ matches }: { matches: MatchRecord[] }) => {
  const { locale } = useLocale()
  const { teamsById } = useTournament()
  const dateLocale = getDateLocale(locale)

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

  const monthDayMatches = cells.filter((cell): cell is { day: number; matches: MatchRecord[] } => Boolean(cell))

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
          <span>Prev</span>
        </button>
        <h3 className="text-lg font-semibold capitalize text-[var(--text-strong)]">{monthLabel}</h3>
        <button
          type="button"
          onClick={() => setActiveMonthIndex((current) => Math.min(calendarData.monthKeys.length - 1, current + 1))}
          disabled={activeMonthIndex === calendarData.monthKeys.length - 1}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>Next</span>
          <Icon name="chevron_right" className="text-[18px]" />
        </button>
      </div>

      <div className="hidden gap-px bg-[var(--border)] md:grid md:grid-cols-7">
        {weekdays.map((weekday) => (
          <div key={weekday} className="bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            {weekday}
          </div>
        ))}
        {cells.map((cell, index) => (
          <div key={`${monthKey}-cell-${index}`} className="min-h-40 bg-[var(--surface)] p-2 align-top">
            {cell ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--text-soft)]">{cell.day}</p>
                <div className="space-y-1.5">
                  {cell.matches.map((match) => {
                    const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                    const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                    const kickoffTime = new Intl.DateTimeFormat(dateLocale, {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: match.venue.timeZone ?? 'UTC',
                    }).format(new Date(match.kickoff))

                    return (
                      <div key={match.id} className={`space-y-1 px-2 py-1.5 text-xs ${statusBadgeClass[match.status]}`}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-[var(--text-strong)]">
                            {homeTeam ? <FlagAvatar team={homeTeam} className="h-4 w-4" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)]" aria-hidden="true" />}
                            <span>{homeTeam ? homeTeam.code : 'TBD'}</span>
                          </span>
                          <span className="font-semibold text-[var(--text-strong)]">{scoreLabel(match)}</span>
                          <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-[var(--text-strong)]">
                            <span>{awayTeam ? awayTeam.code : 'TBD'}</span>
                            {awayTeam ? <FlagAvatar team={awayTeam} className="h-4 w-4" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)]" aria-hidden="true" />}
                          </span>
                        </div>
                        <p>{kickoffTime}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-2 md:hidden">
        {monthDayMatches.map((dayCell) => {
          if (dayCell.matches.length === 0) {
            return null
          }

          const dayDate = new Date(Date.UTC(year, month - 1, dayCell.day))
          const dayLabel = new Intl.DateTimeFormat(dateLocale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'UTC',
          }).format(dayDate)

          return (
            <section key={`${monthKey}-mobile-${dayCell.day}`} className="bg-[var(--surface)] p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">{dayLabel}</h4>
              <div className="space-y-2">
                {dayCell.matches.map((match) => {
                  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                  const kickoffTime = new Intl.DateTimeFormat(dateLocale, {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: match.venue.timeZone ?? 'UTC',
                  }).format(new Date(match.kickoff))

                  return (
                    <div key={match.id} className={`flex flex-col items-center gap-2 px-2 py-2 text-xs ${statusBadgeClass[match.status]}`}>
                      <div className="flex w-full items-center justify-center gap-2 font-semibold text-[var(--text-strong)]">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          {homeTeam ? <FlagAvatar team={homeTeam} className="h-5 w-5" /> : <span className="h-5 w-5 shrink-0 rounded-full border border-[var(--border)]" aria-hidden="true" />}
                          <span className="truncate">{homeTeam ? getLocalizedText(homeTeam.name, locale) : 'TBD'}</span>
                        </span>
                        <span>{scoreLabel(match)}</span>
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{awayTeam ? getLocalizedText(awayTeam.name, locale) : 'TBD'}</span>
                          {awayTeam ? <FlagAvatar team={awayTeam} className="h-5 w-5" /> : <span className="h-5 w-5 shrink-0 rounded-full border border-[var(--border)]" aria-hidden="true" />}
                        </span>
                      </div>
                      <p className="text-center">{kickoffTime}</p>
                    </div>
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
