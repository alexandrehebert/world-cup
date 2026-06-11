import type { LocaleCode, LocalizedText, MatchRecord } from '../types/tournament'

export const getLocalizedText = (value: LocalizedText, locale: LocaleCode) => value[locale]

const getTodayKey = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(new Date())

const getDateKey = (kickoff: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(new Date(kickoff))

export const formatMatchDate = (kickoff: string, locale: LocaleCode, timeZone?: string, todayLabel?: string) => {
  const date = new Date(kickoff)
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB'
  const resolvedTimeZone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const isToday = getDateKey(kickoff, resolvedTimeZone) === getTodayKey(resolvedTimeZone)

  const timeOnly = new Intl.DateTimeFormat(dateLocale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: resolvedTimeZone,
  }).format(date)

  const localDateTime = isToday && todayLabel
    ? `${todayLabel}, ${timeOnly}`
    : new Intl.DateTimeFormat(dateLocale, {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: resolvedTimeZone,
      }).format(date)

  const localTime = new Intl.DateTimeFormat(dateLocale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: resolvedTimeZone,
    timeZoneName: 'short',
  }).format(date)

  const utcDateTime = new Intl.DateTimeFormat(dateLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)

  return { localDateTime, localTime, utcDateTime }
}

export const formatMatchStage = (match: MatchRecord) => {
  switch (match.stage) {
    case 'group':
      return 'group'
    case 'roundOf16':
      return 'roundOf16'
    case 'quarterFinal':
      return 'quarterFinal'
    case 'semiFinal':
      return 'semiFinal'
    case 'thirdPlace':
      return 'thirdPlace'
    case 'final':
      return 'final'
    default:
      return 'group'
  }
}
