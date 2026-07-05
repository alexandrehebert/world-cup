import type { useLocale } from '../contexts/locale-context'
import type { MatchOutcome } from '../types/predictions'
import { getIntlDateLocale } from '../translations/intl'
import type { LocaleCode } from '../types/tournament'

export const inferOutcomeFromScores = (homeRaw: string, awayRaw: string): MatchOutcome | null => {
  const homeValue = homeRaw.trim()
  const awayValue = awayRaw.trim()

  if (!homeValue || !awayValue) return null

  const homeScore = Number(homeValue)
  const awayScore = Number(awayValue)
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) return null

  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  return 'draw'
}

export const getDateLocale = (locale: ReturnType<typeof useLocale>['locale']) =>
  getIntlDateLocale(locale)

const COUNTDOWN_UNITS: Record<LocaleCode, {
  prefix: string
  minuteSingular: string
  minutePlural: string
  daySingular: string
  dayPlural: string
  hourShort: string
  minuteShort: string
  hourJoiner: string
}> = {
  en: {
    prefix: 'in',
    minuteSingular: 'minute',
    minutePlural: 'minutes',
    daySingular: 'day',
    dayPlural: 'days',
    hourShort: 'h',
    minuteShort: 'm',
    hourJoiner: '',
  },
  fr: {
    prefix: 'dans',
    minuteSingular: 'minute',
    minutePlural: 'minutes',
    daySingular: 'jour',
    dayPlural: 'jours',
    hourShort: 'h',
    minuteShort: 'min',
    hourJoiner: ' ',
  },
  es: {
    prefix: 'en',
    minuteSingular: 'minuto',
    minutePlural: 'minutos',
    daySingular: 'día',
    dayPlural: 'días',
    hourShort: 'h',
    minuteShort: 'min',
    hourJoiner: ' ',
  },
  de: {
    prefix: 'in',
    minuteSingular: 'Minute',
    minutePlural: 'Minuten',
    daySingular: 'Tag',
    dayPlural: 'Tage',
    hourShort: 'Std.',
    minuteShort: 'Min.',
    hourJoiner: ' ',
  },
}

export const getMatchDayKey = (kickoff: string, timeZone?: string) => {
  const date = new Date(kickoff)
  const resolvedTimeZone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: resolvedTimeZone,
  }).format(date)
}

export const formatNextKickoffCountdown = (
  kickoffMs: number,
  nowMs: number,
  locale: ReturnType<typeof useLocale>['locale'],
) => {
  const minutes = Math.max(1, Math.ceil((kickoffMs - nowMs) / 60000))
  const units = COUNTDOWN_UNITS[locale]

  if (minutes < 60) {
    return `${units.prefix} ${minutes} ${minutes === 1 ? units.minuteSingular : units.minutePlural}`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) {
    return `${units.prefix} ${hours}${units.hourJoiner}${units.hourShort}${remainingMinutes > 0 ? ` ${remainingMinutes} ${units.minuteShort}` : ''}`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${units.prefix} ${days} ${days === 1 ? units.daySingular : units.dayPlural}${remainingHours > 0 ? ` ${remainingHours} ${units.hourShort}` : ''}`
}
