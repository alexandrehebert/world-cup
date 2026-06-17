import type { useLocale } from '../contexts/locale-context'
import type { MatchOutcome } from '../types/predictions'

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
  locale === 'fr' ? 'fr-FR' : 'en-GB'

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

  if (minutes < 60) {
    return locale === 'fr'
      ? `dans ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
      : `in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) {
    return locale === 'fr'
      ? `dans ${hours} h${remainingMinutes > 0 ? ` ${remainingMinutes} min` : ''}`
      : `in ${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return locale === 'fr'
    ? `dans ${days} ${days === 1 ? 'jour' : 'jours'}${remainingHours > 0 ? ` ${remainingHours} h` : ''}`
    : `in ${days} ${days === 1 ? 'day' : 'days'}${remainingHours > 0 ? ` ${remainingHours}h` : ''}`
}
