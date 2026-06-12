import type { LocaleCode, MatchRecord } from '../types/tournament'
import type { TranslationSet } from '../translations/types'

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

export const formatPlaceholder = (key: string, t: TranslationSet): string => {
  const [type, a, b] = key.split(':')

  if (type === 'G1') return `${t.labels.bracketGroup1st} ${a}`
  if (type === 'G2') return `${t.labels.bracketGroup2nd} ${a}`
  if (type === 'G3') return `${t.labels.bracketGroup3rd} ${a.split('').join('·')}`

  const roundName: Record<string, string> = {
    roundOf32: t.labels.stageRoundOf32,
    roundOf16: t.labels.stageRoundOf16,
    quarterFinal: t.labels.stageQuarterFinal,
    semiFinal: t.labels.stageSemiFinal,
  }

  if (type === 'W') return `${t.labels.bracketWinner} ${roundName[a] ?? a} ${b}`
  if (type === 'L') return `${t.labels.bracketLoser} ${roundName[a] ?? a} ${b}`

  return key
}

export const getDisplayMatchStatus = (match: MatchRecord, nowMs = Date.now()) => {
  const kickoffMs = new Date(match.kickoff).getTime()

  if (match.status === 'scheduled' && Number.isFinite(kickoffMs) && nowMs >= kickoffMs) {
    return 'live'
  }

  return match.status
}

const getEspnStatusDetail = (match: MatchRecord) => {
  const shortDetail = match.live?.shortDetail?.trim()
  if (shortDetail) {
    return shortDetail
  }

  const detail = match.live?.detail?.trim()
  if (detail) {
    return detail
  }

  return null
}

export const getMatchDisplayTime = (
  match: MatchRecord,
  labels: TranslationSet['labels'],
  nowMs = Date.now(),
) => {
  const displayStatus = getDisplayMatchStatus(match, nowMs)
  const espnDetail = getEspnStatusDetail(match)

  if (displayStatus === 'live') {
    if (espnDetail) {
      return espnDetail
    }

    const displayClock = match.live?.displayClock?.trim()
    if (displayClock) {
      return displayClock
    }

    return labels.live
  }

  if (displayStatus === 'finished') {
    if (espnDetail) {
      return espnDetail
    }

    const displayClock = match.live?.displayClock?.trim()
    return displayClock ? `${labels.fullTime} · ${displayClock}` : labels.fullTime
  }

  return null
}
