import type { MatchRecord } from '../types/tournament'

export interface ScheduleCalendarDay {
  label: string
  weekday: string
  day: string
  isToday: boolean
  matches: MatchRecord[]
}

export const buildScheduleCalendarDays = (
  scheduledMatches: MatchRecord[],
  dateLocale: string,
  localTimeZone: string,
  todayLabel: string,
  nowMs: number,
) => {
  const grouped = new Map<string, ScheduleCalendarDay>()
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: localTimeZone,
  }).format(new Date(nowMs))

  for (const match of scheduledMatches) {
    const date = new Date(match.kickoff)
    const dayKey = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: localTimeZone,
    }).format(date)

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, {
        label: dayKey === todayKey
          ? todayLabel
          : new Intl.DateTimeFormat(dateLocale, {
              day: 'numeric',
              month: 'short',
              timeZone: localTimeZone,
            }).format(date),
        weekday: new Intl.DateTimeFormat(dateLocale, {
          weekday: 'short',
          timeZone: localTimeZone,
        }).format(date),
        day: new Intl.DateTimeFormat(dateLocale, {
          day: '2-digit',
          timeZone: localTimeZone,
        }).format(date),
        isToday: dayKey === todayKey,
        matches: [],
      })
    }

    grouped.get(dayKey)?.matches.push(match)
  }

  return [...grouped.values()].slice(0, 4)
}
