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

export const getLocalizedText = (value: unknown, locale: LocaleCode): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const map = value as Record<string, unknown>
  const localized = map[locale]
  if (typeof localized === 'string' && localized.trim().length > 0) {
    return localized.trim()
  }

  const fallbackEn = map.en
  if (typeof fallbackEn === 'string' && fallbackEn.trim().length > 0) {
    return fallbackEn.trim()
  }

  const fallbackFr = map.fr
  if (typeof fallbackFr === 'string' && fallbackFr.trim().length > 0) {
    return fallbackFr.trim()
  }

  return null
}

const getEspnStatusDetail = (match: MatchRecord, locale: LocaleCode) => {
  const shortDetail = getLocalizedText(match.live?.shortDetail, locale)
  if (shortDetail) {
    return shortDetail
  }

  const detail = getLocalizedText(match.live?.detail, locale)
  if (detail) {
    return detail
  }

  return null
}

const getFinishedStatusDetail = (espnDetail: string | null, labels: TranslationSet['labels']) => {
  if (!espnDetail) {
    return null
  }

  const trimmed = espnDetail.trim()

  // ESPN often sends a raw FT token; expand it to the localized full-time label.
  if (/^F\.?T\.?$/i.test(trimmed) || /^full[\s-]?time$/i.test(trimmed)) {
    return labels.fullTime
  }

  return trimmed
}

const parseDisplayClockToSeconds = (displayClock: string | undefined) => {
  if (!displayClock) {
    return null
  }

  const match = displayClock.trim().match(/^(\d{1,3}):(\d{2})$/)
  if (!match) {
    return null
  }

  const minutes = Number(match[1])
  const seconds = Number(match[2])

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds < 0 || seconds > 59) {
    return null
  }

  return minutes * 60 + seconds
}

const formatClockFromSeconds = (totalSeconds: number) => {
  const clampedSeconds = Math.max(0, Math.trunc(totalSeconds))
  const minutes = Math.floor(clampedSeconds / 60)
  return `${minutes}'`
}

const isPausedLiveDetail = (detail: string | null) => {
  if (!detail) {
    return false
  }

  return /(half[\s-]?time|mi-temps|pause|break|delayed|suspended|postponed|interrupted)/i.test(detail)
}

const getExtrapolatedLiveClock = (match: MatchRecord, nowMs: number) => {
  if (match.live?.state !== 'in') {
    return null
  }

  const clockFromDisplay = parseDisplayClockToSeconds(match.live.displayClock)
  const clockFromLiveField = typeof match.live.clock === 'number' && Number.isFinite(match.live.clock)
    ? Math.max(0, Math.trunc(match.live.clock))
    : null
  const baseClockSeconds = clockFromDisplay ?? clockFromLiveField

  if (baseClockSeconds === null) {
    return null
  }

  const syncedAtMs = match.live.syncedAt ? new Date(match.live.syncedAt).getTime() : Number.NaN
  const elapsedSeconds = Number.isFinite(syncedAtMs)
    ? Math.max(0, Math.floor((nowMs - syncedAtMs) / 1000))
    : 0

  return formatClockFromSeconds(baseClockSeconds + elapsedSeconds)
}

export const getMatchDisplayTime = (
  match: MatchRecord,
  labels: TranslationSet['labels'],
  nowMs = Date.now(),
  locale: LocaleCode = 'en',
) => {
  const displayStatus = getDisplayMatchStatus(match, nowMs)
  const espnDetail = getEspnStatusDetail(match, locale)

  if (displayStatus === 'live') {
    if (isPausedLiveDetail(espnDetail)) {
      return espnDetail
    }

    const extrapolatedClock = getExtrapolatedLiveClock(match, nowMs)
    if (extrapolatedClock) {
      return extrapolatedClock
    }

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
    const finishedStatusDetail = getFinishedStatusDetail(espnDetail, labels)
    if (finishedStatusDetail) {
      return finishedStatusDetail
    }

    const displayClock = match.live?.displayClock?.trim()
    return displayClock ? `${labels.fullTime} · ${displayClock}` : labels.fullTime
  }

  return null
}
