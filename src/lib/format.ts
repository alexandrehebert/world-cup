import type { LocaleCode, LocalizedText, MatchRecord } from '../types/tournament'

export const getLocalizedText = (value: LocalizedText, locale: LocaleCode) => value[locale]

export const formatMatchDate = (kickoff: string, locale: LocaleCode, timeZone?: string) => {
  const date = new Date(kickoff)
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB'
  const resolvedTimeZone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  const localDateTime = new Intl.DateTimeFormat(dateLocale, {
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
