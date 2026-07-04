import type { MatchRecord } from '../types/tournament'

export interface ScheduleCalendarDay {
  label: string
  weekday: string
  day: string
  matches: MatchRecord[]
}

export const buildScheduleCalendarDays = (
  scheduledMatches: MatchRecord[],
  dateLocale: string,
  localTimeZone: string,
) => {
  const grouped = new Map<string, ScheduleCalendarDay>()

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
        label: new Intl.DateTimeFormat(dateLocale, {
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
        matches: [],
      })
    }

    grouped.get(dayKey)?.matches.push(match)
  }

  return [...grouped.values()].slice(0, 4)
}
