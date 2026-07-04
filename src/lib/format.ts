import type { LocaleCode, MatchRecord } from '../types/tournament'
import type { TranslationSet } from '../translations/types'

const LIVE_INFERENCE_WINDOW_MS = 3 * 60 * 60 * 1000
const HALF_TIME_DETAIL_PATTERN = /(^h\.?t\.?$|half[\s-]?time|mi-temps)/i

export const getMatchDayKey = (kickoff: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(new Date(kickoff))

export const getTodayMatchDayKey = (nowMs: number, timeZone: string) =>
  getMatchDayKey(new Date(nowMs).toISOString(), timeZone)

const getTodayKey = (timeZone: string) =>
  getTodayMatchDayKey(Date.now(), timeZone)

const getDateKey = (kickoff: string, timeZone: string) =>
  getMatchDayKey(kickoff, timeZone)

export const formatUtcOffsetLabel = (kickoff: string, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(kickoff))

  const timeZoneName = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0'
  return timeZoneName.replace('GMT', 'UTC').replace('UTC-0', 'UTC+0')
}

export const formatMatchTime = (kickoff: string, locale: LocaleCode, timeZone?: string) => {
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB'
  const resolvedTimeZone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  return new Intl.DateTimeFormat(dateLocale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: resolvedTimeZone,
  }).format(new Date(kickoff))
}

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

  const localShortDate = new Intl.DateTimeFormat(dateLocale, {
    dateStyle: 'short',
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

  return { localDateTime, localShortDate, localTime, utcDateTime }
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

  if (match.status === 'scheduled' && Number.isFinite(kickoffMs)) {
    if (nowMs < kickoffMs) {
      return 'scheduled'
    }

    if (nowMs <= kickoffMs + LIVE_INFERENCE_WINDOW_MS) {
      return 'live'
    }

    if (typeof match.home.score === 'number' && typeof match.away.score === 'number') {
      return 'finished'
    }

    return 'scheduled'
  }

  return match.status
}

export const hasDisplayScore = (match: MatchRecord, nowMs = Date.now()) => {
  const displayStatus = getDisplayMatchStatus(match, nowMs)

  return (
    displayStatus !== 'scheduled' &&
    Number.isFinite(match.home.score) &&
    Number.isFinite(match.away.score)
  )
}

/**
 * Returns the winner side ('home' | 'away') of a finished match, considering
 * penalty scores when regular scores are tied. Returns null when the winner
 * cannot be determined (match not finished, no scores, or a true draw).
 */
export const getMatchWinner = (match: MatchRecord, nowMs = Date.now()): 'home' | 'away' | null => {
  const displayStatus = getDisplayMatchStatus(match, nowMs)
  if (displayStatus !== 'finished') return null

  const homeScore = match.home.score
  const awayScore = match.away.score
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null

  if ((homeScore as number) > (awayScore as number)) return 'home'
  if ((awayScore as number) > (homeScore as number)) return 'away'

  // Tied after regulation/AET — check penalty shootout
  const homePenalty = match.home.penaltyScore
  const awayPenalty = match.away.penaltyScore
  if (Number.isFinite(homePenalty) && Number.isFinite(awayPenalty)) {
    if ((homePenalty as number) > (awayPenalty as number)) return 'home'
    if ((awayPenalty as number) > (homePenalty as number)) return 'away'
  }

  return null
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

  // Expand ESPN shorthand tokens used at full-time.
  if (/^F\.?T\.?[-\s]?P(?:EN|ENS)\.?$/i.test(trimmed) || /^pen(?:alty|alties)$/i.test(trimmed)) {
    return labels.afterPenalties
  }

  if (/^(?:F\.?T\.?[-\s]?)?A\.?E\.?T\.?$/i.test(trimmed) || /^after extra(?:[\s-]?time)?$/i.test(trimmed)) {
    return labels.afterExtraTime
  }

  // ESPN/World Rugby often send raw completion tokens; expand to localized full-time label.
  if (/^F\.?T\.?$/i.test(trimmed) || /^C$/i.test(trimmed) || /^full[\s-]?time$/i.test(trimmed) || /^completed$/i.test(trimmed)) {
    return labels.fullTime
  }

  return trimmed
}

export const getLiveStatusDetail = (
  espnDetail: string | null,
  locale: LocaleCode,
) => {
  if (!espnDetail) {
    return null
  }

  const trimmed = espnDetail.trim()
  const normalized = trimmed.toUpperCase().replace(/\s+/g, '')

  if (normalized === 'L1' || normalized === '1H') {
    return locale === 'fr' ? '1re mi-temps' : '1st half'
  }

  if (normalized === 'L2' || normalized === '2H') {
    return locale === 'fr' ? '2e mi-temps' : '2nd half'
  }

  return trimmed
}

const parseDisplayClockToSeconds = (displayClock: string | undefined) => {
  if (!displayClock) {
    return null
  }

  const raw = displayClock.trim()
  const mmss = raw.match(/^(\d{1,3}):(\d{2})$/)
  if (mmss) {
    const minutes = Number(mmss[1])
    const seconds = Number(mmss[2])

    if (Number.isFinite(minutes) && Number.isFinite(seconds) && seconds >= 0 && seconds <= 59) {
      return minutes * 60 + seconds
    }
  }

  const minuteOnly = raw.match(/^(\d{1,3})\s*['’]$/)
  if (minuteOnly) {
    const minutes = Number(minuteOnly[1])
    if (Number.isFinite(minutes)) {
      return minutes * 60
    }
  }

  const stoppageTime = raw.match(/^(\d{1,3})\s*\+\s*(\d{1,2})\s*['’]$/)
  if (stoppageTime) {
    const baseMinutes = Number(stoppageTime[1])
    const addedMinutes = Number(stoppageTime[2])
    if (Number.isFinite(baseMinutes) && Number.isFinite(addedMinutes)) {
      return (baseMinutes + addedMinutes) * 60
    }
  }

  return null
}

const parseClockFromDetailToSeconds = (detail: string | null) => {
  if (!detail) {
    return null
  }

  const mmss = detail.match(/(\d{1,3}):(\d{2})/)
  if (mmss) {
    return parseDisplayClockToSeconds(`${mmss[1]}:${mmss[2]}`)
  }

  const stoppageTime = detail.match(/(\d{1,3})\s*\+\s*(\d{1,2})\s*['’]/)
  if (stoppageTime) {
    return parseDisplayClockToSeconds(`${stoppageTime[1]}+${stoppageTime[2]}'`)
  }

  const minuteOnly = detail.match(/(\d{1,3})\s*['’]/)
  if (minuteOnly) {
    return parseDisplayClockToSeconds(`${minuteOnly[1]}'`)
  }

  return null
}

const parseStoppageBaseMinute = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  const stoppageMatch = value.match(/(\d{1,3})\s*\+\s*\d{1,2}\s*['’]?/)
  if (!stoppageMatch) {
    return null
  }

  const baseMinutes = Number(stoppageMatch[1])
  return Number.isFinite(baseMinutes) ? baseMinutes : null
}

const getPeriodBoundaryMinute = (period: number | undefined) => {
  if (period === 1) return 45
  if (period === 2) return 90
  if (period === 3) return 105
  if (period === 4) return 120
  return null
}

const formatClockFromSeconds = (totalSeconds: number, stoppageBaseMinute: number | null = null) => {
  const clampedSeconds = Math.max(0, Math.trunc(totalSeconds))
  const minutes = Math.floor(clampedSeconds / 60)

  if (stoppageBaseMinute !== null && minutes > stoppageBaseMinute) {
    return `${stoppageBaseMinute}'+${minutes - stoppageBaseMinute}`
  }

  return `${minutes}'`
}

const isPausedLiveDetail = (detail: string | null) => {
  if (!detail) {
    return false
  }

  return (
    HALF_TIME_DETAIL_PATTERN.test(detail) ||
    /(pause|break|delayed|suspended|postponed|interrupted)/i.test(detail)
  )
}

const isHalfTimeLiveDetail = (detail: string | null) => {
  if (!detail) {
    return false
  }

  return HALF_TIME_DETAIL_PATTERN.test(detail)
}

const getExtrapolatedLiveClock = (match: MatchRecord, nowMs: number, espnDetail: string | null) => {
  if (match.live?.state !== 'in') {
    return null
  }

  const clockFromDisplay = parseDisplayClockToSeconds(match.live.displayClock)
  const clockFromLiveField = typeof match.live.clock === 'number' && Number.isFinite(match.live.clock)
    ? Math.max(0, Math.trunc(match.live.clock))
    : null
  const baseClockFromDetail = parseClockFromDetailToSeconds(espnDetail)
  const baseClockCandidates = [clockFromDisplay, clockFromLiveField, baseClockFromDetail].filter(
    (value): value is number => value !== null,
  )
  const baseClockSeconds = baseClockCandidates.length > 0 ? Math.max(...baseClockCandidates) : null

  if (baseClockSeconds === null) {
    return null
  }

  const syncedAtMs = match.live.syncedAt ? new Date(match.live.syncedAt).getTime() : Number.NaN
  const elapsedSeconds = Number.isFinite(syncedAtMs)
    ? Math.max(0, Math.floor((nowMs - syncedAtMs) / 1000))
    : 0

  const periodBoundaryMinute = getPeriodBoundaryMinute(match.live?.period)
  const totalSeconds = baseClockSeconds + elapsedSeconds
  const totalMinutes = Math.floor(totalSeconds / 60)
  const inferredStoppageBoundary =
    periodBoundaryMinute !== null &&
    totalMinutes > periodBoundaryMinute &&
    baseClockSeconds <= periodBoundaryMinute * 60
      ? periodBoundaryMinute
      : null
  const explicitStoppageBoundary =
    parseStoppageBaseMinute(match.live?.displayClock) ?? parseStoppageBaseMinute(espnDetail)

  return formatClockFromSeconds(totalSeconds, explicitStoppageBoundary ?? inferredStoppageBoundary)
}

export const getMatchDisplayTime = (
  match: MatchRecord,
  labels: TranslationSet['labels'],
  nowMs = Date.now(),
  locale: LocaleCode = 'en',
) => {
  const displayStatus = getDisplayMatchStatus(match, nowMs)
  const espnDetail = getEspnStatusDetail(match, locale)
  const liveStatusDetail = getLiveStatusDetail(espnDetail, locale)

  if (displayStatus === 'live') {
    if (isPausedLiveDetail(espnDetail)) {
      return isHalfTimeLiveDetail(espnDetail) ? labels.halfTime : liveStatusDetail
    }

    const extrapolatedClock = getExtrapolatedLiveClock(match, nowMs, espnDetail)
    if (extrapolatedClock) {
      return extrapolatedClock
    }

    if (liveStatusDetail) {
      return liveStatusDetail
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
