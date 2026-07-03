import type { MatchLiveRecord, MatchRecord, TournamentData } from '../types/tournament'
import { getActiveCompetitionProfile } from '../competitions'
import { resolveGroupBracketTeams } from '../lib/bracket'
import { usesStandingsSectionPath } from '../lib/competition-sections'
import { sortGroupStandings } from '../lib/standings'
import {
  extractPenaltyScore,
  isPenaltyShootoutCompetition,
  mergeEspnSummaryShootoutScores,
  type EspnEvent,
  type EspnPayload,
  type EspnSummary,
} from './espn-sync'
import { loadTournamentData, saveTournamentData } from './tournament-data'
import { scoreFinishedMatches } from './predictions-scoring'

const DEFAULT_ESPN_LOOKBACK_DAYS = 7
const KICKOFF_FALLBACK_WINDOW_MINUTES = 180

const toUtcDateKey = (date: Date) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const isMissingKnockoutPenaltyScores = (match: MatchRecord) => {
  const homeScore = match.home?.score
  const awayScore = match.away?.score
  const homePenaltyScore = match.home?.penaltyScore
  const awayPenaltyScore = match.away?.penaltyScore

  const hasValidRegulationScore = Number.isFinite(homeScore) && Number.isFinite(awayScore)
  const isRegulationDraw = hasValidRegulationScore && homeScore === awayScore
  const hasPenaltyScores = Number.isFinite(homePenaltyScore) && Number.isFinite(awayPenaltyScore)
  const isKnockoutStage = match.stage !== 'group'
  const liveDetail = `${match.live?.detail ?? ''} ${match.live?.shortDetail ?? ''}`.toLowerCase()
  const explicitlyPenaltyDecided = liveDetail.includes('pen')

  return match.status === 'finished' && isKnockoutStage && isRegulationDraw && !hasPenaltyScores && explicitlyPenaltyDecided
}

export const getEspnDateWindow = (data: TournamentData, now = new Date()) => {
  const offsets = [-1, 0, 1]
  const lookbackDays = Number(process.env.ESPN_LOOKBACK_DAYS ?? DEFAULT_ESPN_LOOKBACK_DAYS)
  const sanitizedLookbackDays = Number.isFinite(lookbackDays) && lookbackDays > 0 ? Math.trunc(lookbackDays) : DEFAULT_ESPN_LOOKBACK_DAYS
  const lookbackStart = new Date(now)
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - sanitizedLookbackDays)
  const keys = new Set(
    offsets.map((offset) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset))
      return toUtcDateKey(date)
    }),
  )

  for (const match of data.matches) {
    if (match.status === 'finished' && !isMissingKnockoutPenaltyScores(match)) {
      continue
    }

    const kickoff = new Date(match.kickoff)
    if (Number.isNaN(kickoff.getTime())) {
      continue
    }

    const isPastOrNowKickoff = kickoff <= now
    const shouldBackfillPastUnresolvedMatch = isPastOrNowKickoff && match.status !== 'finished'

    if (shouldBackfillPastUnresolvedMatch || (isPastOrNowKickoff && kickoff >= lookbackStart)) {
      keys.add(toUtcDateKey(kickoff))

      // ESPN scoreboard `dates` is based on US local calendar day, which can
      // place late-night UTC kickoffs in the previous bucket.
      const previousDay = new Date(kickoff)
      previousDay.setUTCDate(previousDay.getUTCDate() - 1)
      keys.add(toUtcDateKey(previousDay))
    }
  }

  return [...keys].sort()
}

const isEspnScoreboardUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl)
    const isEspnHost = parsed.hostname.includes('espn.com')
    const normalizedPathname = parsed.pathname.replace(/\/+$/, '')
    const isScoreboardPath = normalizedPathname.endsWith('/scoreboard')

    return isEspnHost && isScoreboardPath
  } catch {
    return false
  }
}

type WorldRugbyTeam = {
  id?: string
  altId?: string
  name?: string
  abbreviation?: string
}

type WorldRugbyMatch = {
  matchId?: string
  matchAltId?: string
  status?: string
  clock?: { secs?: number; label?: string }
  scores?: Array<number | string | null>
  teams?: [WorldRugbyTeam?, WorldRugbyTeam?] | WorldRugbyTeam[]
  time?: { millis?: number }
  venue?: {
    name?: string
    city?: string
    country?: string
  }
}

type WorldRugbySchedulePayload = {
  event?: { id?: string; label?: string }
  matches?: WorldRugbyMatch[]
}

type WorldRugbyStandingsRow = {
  team?: { abbreviation?: string }
  abbreviation?: string
  code?: string
  played?: number | string
  won?: number | string
  drawn?: number | string
  lost?: number | string
  pointsFor?: number | string
  pointsAgainst?: number | string
  points?: number | string
  p?: number | string
  w?: number | string
  d?: number | string
  l?: number | string
  pf?: number | string
  pa?: number | string
  pts?: number | string
}

type WorldRugbyStandingsTable = {
  id?: string
  label?: string
  name?: string
  entries?: WorldRugbyStandingsRow[]
  rows?: WorldRugbyStandingsRow[]
  teams?: WorldRugbyStandingsRow[]
}

type WorldRugbyStandingsPayload = {
  tables?: WorldRugbyStandingsTable[]
}

type WorldRugbyTeamsPayload = {
  teams?: WorldRugbyTeam[]
}

type WorldRugbySyncPayload = {
  provider: 'world-rugby'
  schedule: WorldRugbySchedulePayload
  teams: WorldRugbyTeamsPayload
  standings: WorldRugbyStandingsPayload
}

export const hasWorldRugbyStandingsRows = (tables: WorldRugbyStandingsTable[] | undefined) => {
  return (tables ?? []).some((table) => {
    const rows = table.entries ?? table.rows ?? table.teams ?? []
    return rows.length > 0
  })
}

const isWorldRugbyScheduleUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl)
    return parsed.hostname === 'api.wr-rims-prod.pulselive.com' && /\/rugby\/v3\/event\/[^/]+\/schedule\/?$/.test(parsed.pathname)
  } catch {
    return false
  }
}

const isWorldRugbySchedulePayload = (value: unknown): value is WorldRugbySchedulePayload => {
  return !!value && typeof value === 'object' && Array.isArray((value as { matches?: unknown[] }).matches)
}

const isWorldRugbySyncPayload = (value: unknown): value is WorldRugbySyncPayload => {
  return !!value && typeof value === 'object' && (value as { provider?: unknown }).provider === 'world-rugby'
}

export const normalizeWorldRugbyStatus = (status: string | undefined, clockSeconds: number | undefined): MatchRecord['status'] => {
  const normalized = (status ?? '').trim().toUpperCase()
  if (normalized === 'U' || normalized === 'PRE' || normalized === 'S') {
    return 'scheduled'
  }

  if (normalized === 'C' || normalized === 'FT' || normalized === 'AET' || normalized === 'F' || normalized === 'PEN' || normalized === 'POST') {
    return 'finished'
  }

  if (normalized === 'L' || normalized === 'LIVE' || normalized === '1H' || normalized === '2H' || normalized === 'HT' || normalized === 'ET') {
    return 'live'
  }

  return typeof clockSeconds === 'number' && clockSeconds > 0 ? 'live' : 'scheduled'
}

const WORLD_RUGBY_FLAG_BY_CODE: Record<string, string> = {
  ARG: 'ar',
  AUS: 'au',
  ENG: 'gb-eng',
  FRA: 'fr',
  IRL: 'ie',
  IRE: 'ie',
  ITA: 'it',
  JPN: 'jp',
  NZL: 'nz',
  RSA: 'za',
  SCO: 'gb-sct',
  WAL: 'gb-wls',
  FJI: 'fj',
}

const toWorldRugbyTeamCode = (team: WorldRugbyTeam) => (team.abbreviation ?? '').trim().toUpperCase()

const toWorldRugbyTeamId = (team: WorldRugbyTeam) => {
  const code = toWorldRugbyTeamCode(team)
  return code ? code.toLowerCase() : `team-${String(team.id ?? team.altId ?? '').trim().toLowerCase()}`
}

const toNumberOrZero = (value: unknown) => {
  const parsed = normalizeScore(value)
  return parsed ?? 0
}

const mergeEspnPayloads = (payloads: EspnPayload[]): EspnPayload => {
  const eventsById = new Map<string, EspnEvent>()
  const fallbackEvents: EspnEvent[] = []
  let updatedAt = ''

  for (const payload of payloads) {
    if (typeof payload.updatedAt === 'string' && payload.updatedAt > updatedAt) {
      updatedAt = payload.updatedAt
    }

    for (const event of payload.events ?? []) {
      if (typeof event?.date !== 'string') {
        fallbackEvents.push(event)
        continue
      }

      const id = (event as { id?: unknown }).id
      if (typeof id === 'string') {
        eventsById.set(id, event)
      } else {
        fallbackEvents.push(event)
      }
    }
  }

  return {
    updatedAt: updatedAt || undefined,
    events: [...eventsById.values(), ...fallbackEvents],
  }
}

const buildEspnSummaryUrl = (scoreboardUrl: URL, eventId: string) => {
  const summaryUrl = new URL(scoreboardUrl.toString())
  summaryUrl.pathname = summaryUrl.pathname.replace(/\/scoreboard\/?$/, '/summary')
  summaryUrl.search = ''
  summaryUrl.searchParams.set('event', eventId)
  return summaryUrl.toString()
}

const fetchEspnSummary = async (scoreboardUrl: URL, eventId: string) => {
  const response = await fetch(buildEspnSummaryUrl(scoreboardUrl, eventId), { cache: 'no-store' })
  if (!response.ok) {
    console.error(`Failed to fetch ESPN summary for event ${eventId} (${response.status})`)
    return undefined
  }

  return (await response.json()) as EspnSummary
}

const enrichEspnPayloadWithShootoutScores = async (payload: EspnPayload, scoreboardUrl: URL) => {
  const events = payload.events ?? []
  if (events.length === 0) {
    return payload
  }

  const nextEvents = await Promise.all(
    events.map(async (event) => {
      const primaryCompetition = Array.isArray(event.competitions) ? event.competitions[0] : undefined
      const competitors = primaryCompetition?.competitors
      const eventId = typeof event.id === 'string' ? event.id : undefined

      if (
        !eventId ||
        !isPenaltyShootoutCompetition(primaryCompetition) ||
        !Array.isArray(competitors) ||
        competitors.length === 0 ||
        competitors.every((competitor) => extractPenaltyScore(competitor) !== undefined)
      ) {
        return event
      }

      const summary = await fetchEspnSummary(scoreboardUrl, eventId)
      return summary ? mergeEspnSummaryShootoutScores(event, summary) : event
    }),
  )

  return {
    ...payload,
    events: nextEvents,
  }
}

const fetchMatchResultsPayload = async (resultsUrl: string, data: TournamentData) => {
  if (isWorldRugbyScheduleUrl(resultsUrl)) {
    const scheduleResponse = await fetch(resultsUrl, { cache: 'no-store' })

    if (!scheduleResponse.ok) {
      throw new Error(`Failed to fetch match results (${scheduleResponse.status})`)
    }

    const schedulePayload = (await scheduleResponse.json()) as WorldRugbySchedulePayload
    const scheduleUrl = new URL(resultsUrl)
    const eventBasePath = scheduleUrl.pathname.replace(/\/schedule\/?$/, '')
    const teamsUrl = `${scheduleUrl.origin}${eventBasePath}/teams`
    const standingsUrl = `${scheduleUrl.origin}${eventBasePath}/standings`
    const [teamsResponse, standingsResponse] = await Promise.all([
      fetch(teamsUrl, { cache: 'no-store' }),
      fetch(standingsUrl, { cache: 'no-store' }),
    ])

    if (!teamsResponse.ok) {
      throw new Error(`Failed to fetch event teams (${teamsResponse.status})`)
    }

    if (!standingsResponse.ok) {
      throw new Error(`Failed to fetch event standings (${standingsResponse.status})`)
    }

    return {
      provider: 'world-rugby' as const,
      schedule: schedulePayload,
      teams: (await teamsResponse.json()) as WorldRugbyTeamsPayload,
      standings: (await standingsResponse.json()) as WorldRugbyStandingsPayload,
    }
  }

  if (!isEspnScoreboardUrl(resultsUrl)) {
    const response = await fetch(resultsUrl, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Failed to fetch match results (${response.status})`)
    }

    return await response.json()
  }

  const baseUrl = new URL(resultsUrl)
  const dateWindow = baseUrl.searchParams.get('dates')
    ? [baseUrl.searchParams.get('dates') as string]
    : getEspnDateWindow(data)
  const payloads: EspnPayload[] = []

  for (const dateKey of dateWindow) {
    const requestUrl = new URL(baseUrl.toString())
    requestUrl.searchParams.set('dates', dateKey)

    const response = await fetch(requestUrl.toString(), { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Failed to fetch match results (${response.status})`)
    }

    payloads.push((await response.json()) as EspnPayload)
  }

  return await enrichEspnPayloadWithShootoutScores(mergeEspnPayloads(payloads), baseUrl)
}

type UpstreamMatchUpdate = {
  id: string
  status?: MatchRecord['status']
  homeScore?: number | string
  awayScore?: number | string
  homePenaltyScore?: number | string
  awayPenaltyScore?: number | string
  home?: { score?: number | string; penaltyScore?: number | string }
  away?: { score?: number | string; penaltyScore?: number | string }
  score?: { home?: number | string; away?: number | string }
  homeTeamId?: string
  awayTeamId?: string
  live?: Partial<MatchLiveRecord>
}

type SyncInput = {
  headers: Record<string, string | undefined>
}

type SyncResult = {
  ok: true
  scanned: number
  updated: number
  storedAt: string
}

type SyncError = {
  status: number
  body: {
    error: string
    details?: string
  }
}

const normalizeEspnState = (state: string | undefined, completed: boolean | undefined): MatchRecord['status'] | undefined => {
  if (completed === true || state === 'post') {
    return 'finished'
  }

  if (state === 'in') {
    return 'live'
  }

  if (state === 'pre') {
    return 'scheduled'
  }

  return undefined
}

type KickoffFallbackCandidate = {
  matchId: string
  kickoff: string
}

export const resolveKickoffFallbackMatchId = (
  eventDate: string,
  candidates: KickoffFallbackCandidate[],
  windowMinutes: number = KICKOFF_FALLBACK_WINDOW_MINUTES,
): string | undefined => {
  const eventMs = new Date(eventDate).getTime()
  if (!Number.isFinite(eventMs)) {
    return undefined
  }

  const windowMs = Math.max(0, Math.trunc(windowMinutes)) * 60 * 1000
  let bestMatchId: string | undefined
  let bestDiffMs = Number.POSITIVE_INFINITY
  let hasBestDiffTie = false

  for (const candidate of candidates) {
    const kickoffMs = new Date(candidate.kickoff).getTime()
    if (!Number.isFinite(kickoffMs)) {
      continue
    }

    const diffMs = Math.abs(kickoffMs - eventMs)
    if (diffMs > windowMs) {
      continue
    }

    if (diffMs < bestDiffMs) {
      bestDiffMs = diffMs
      bestMatchId = candidate.matchId
      hasBestDiffTie = false
      continue
    }

    if (diffMs === bestDiffMs) {
      hasBestDiffTie = true
    }
  }

  return hasBestDiffTie ? undefined : bestMatchId
}

const buildMatchIndexes = (data: TournamentData) => {
  const teamCodeById = new Map(data.teams.map((team) => [team.id, team.code]))
  const teamIdByCode = new Map(data.teams.map((team) => [team.code, team.id]))
  const byExact = new Map<string, string>()
  const byPair = new Map<string, string[]>()
  const byKickoff = new Map<string, string[]>()
  const byKickoffFallbackCandidates: KickoffFallbackCandidate[] = []

  for (const match of data.matches) {
    const homeId = match.home?.teamId
    const awayId = match.away?.teamId

    if (!homeId || !awayId) {
      // Bracket match without both teams: index by kickoff minute for ESPN fallback matching.
      // Slice to 16 characters to extract 'YYYY-MM-DDTHH:MM' from the ISO 8601 datetime.
      if (match.stage !== 'group') {
        const kickoffKey = match.kickoff.slice(0, 16)
        const kickoffCandidates = byKickoff.get(kickoffKey) ?? []
        kickoffCandidates.push(match.id)
        byKickoff.set(kickoffKey, kickoffCandidates)
        byKickoffFallbackCandidates.push({ matchId: match.id, kickoff: match.kickoff })
      }
      continue
    }

    const homeCode = teamCodeById.get(homeId)
    const awayCode = teamCodeById.get(awayId)

    if (!homeCode || !awayCode) {
      continue
    }

    const kickoffDay = match.kickoff.slice(0, 10)
    const exactKey = `${homeCode}::${awayCode}::${kickoffDay}`
    const pairKey = `${homeCode}::${awayCode}`

    byExact.set(exactKey, match.id)

    const pairMatches = byPair.get(pairKey) ?? []
    pairMatches.push(match.id)
    byPair.set(pairKey, pairMatches)
  }

  return { byExact, byPair, byKickoff, byKickoffFallbackCandidates, teamIdByCode }
}

const toEspnMatchUpdates = (payload: EspnPayload, data: TournamentData): UpstreamMatchUpdate[] => {
  if (!payload || !Array.isArray(payload.events)) {
    return []
  }

  const { byExact, byPair, byKickoff, byKickoffFallbackCandidates, teamIdByCode } = buildMatchIndexes(data)
  const updates: UpstreamMatchUpdate[] = []
  const usedKickoffFallbackMatchIds = new Set<string>()
  const syncedAt = new Date().toISOString()

  for (const event of payload.events) {
    const competition = Array.isArray(event?.competitions) ? event.competitions[0] : undefined
    const competitors = Array.isArray(competition?.competitors) ? competition.competitors : []
    const home = competitors.find((competitor) => competitor?.homeAway === 'home')
    const away = competitors.find((competitor) => competitor?.homeAway === 'away')
    const homeCode = home?.team?.abbreviation
    const awayCode = away?.team?.abbreviation

    let matchId: string | undefined

    if (homeCode && awayCode) {
      const eventDay = typeof event?.date === 'string' ? new Date(event.date).toISOString().slice(0, 10) : ''
      const exactKey = `${homeCode}::${awayCode}::${eventDay}`
      const pairKey = `${homeCode}::${awayCode}`
      const pairMatches = byPair.get(pairKey)
      matchId = byExact.get(exactKey) ?? (pairMatches?.length === 1 ? pairMatches[0] : undefined)
    }

    // Fallback: match bracket matches by kickoff time when teams are not yet assigned
    if (!matchId && typeof event?.date === 'string') {
      const eventMinute = new Date(event.date).toISOString().slice(0, 16)
      const exactKickoffCandidates = (byKickoff.get(eventMinute) ?? []).filter((candidateMatchId) => !usedKickoffFallbackMatchIds.has(candidateMatchId))
      matchId = exactKickoffCandidates.length === 1 ? exactKickoffCandidates[0] : undefined

      if (!matchId) {
        matchId = resolveKickoffFallbackMatchId(
          event.date,
          byKickoffFallbackCandidates.filter((candidate) => !usedKickoffFallbackMatchIds.has(candidate.matchId)),
        )
      }
    }

    if (!matchId) {
      continue
    }

    usedKickoffFallbackMatchIds.add(matchId)

    // Resolve team IDs for bracket matches that ESPN now knows about
    const existingMatch = data.matches.find((m) => m.id === matchId)
    const homeTeamId =
      existingMatch && existingMatch.home && !existingMatch.home.teamId && homeCode
        ? teamIdByCode.get(homeCode)
        : undefined
    const awayTeamId =
      existingMatch && existingMatch.away && !existingMatch.away.teamId && awayCode
        ? teamIdByCode.get(awayCode)
        : undefined

    const nextStatus = normalizeEspnState(competition?.status?.type?.state, competition?.status?.type?.completed)
    const hasPlayableStatus = nextStatus === 'live' || nextStatus === 'finished'

    updates.push({
      id: matchId,
      status: nextStatus,
      homeScore: hasPlayableStatus ? home?.score : undefined,
      awayScore: hasPlayableStatus ? away?.score : undefined,
      homePenaltyScore: hasPlayableStatus ? extractPenaltyScore(home ?? {}) : undefined,
      awayPenaltyScore: hasPlayableStatus ? extractPenaltyScore(away ?? {}) : undefined,
      homeTeamId,
      awayTeamId,
      live: nextStatus
        ? {
            state: competition?.status?.type?.state as MatchLiveRecord['state'],
            period: typeof competition?.status?.period === 'number' ? competition.status.period : undefined,
            clock: typeof competition?.status?.clock === 'number' ? competition.status.clock : undefined,
            displayClock: typeof competition?.status?.displayClock === 'string' ? competition.status.displayClock : undefined,
            detail: typeof competition?.status?.type?.detail === 'string' ? competition.status.type.detail : undefined,
            shortDetail: typeof competition?.status?.type?.shortDetail === 'string' ? competition.status.type.shortDetail : undefined,
            completed: typeof competition?.status?.type?.completed === 'boolean' ? competition.status.type.completed : undefined,
            startDate: typeof competition?.startDate === 'string' ? competition.startDate : undefined,
            syncedAt,
          }
        : undefined,
    })
  }

  return updates
}

const buildWorldRugbyCatalog = (data: TournamentData, payload: WorldRugbySyncPayload): TournamentData => {
  const scheduleMatches = payload.schedule.matches ?? []
  const upstreamTeamsSource = payload.teams.teams && payload.teams.teams.length > 0
    ? payload.teams.teams
    : scheduleMatches.flatMap((match) => (Array.isArray(match.teams) ? match.teams : []))
  const upstreamTeams: WorldRugbyTeam[] = upstreamTeamsSource.filter((team): team is WorldRugbyTeam => !!team)
  const teamsByCode = new Map<string, TournamentData['teams'][number]>()
  const mergedTeams = [...data.teams]

  for (const team of mergedTeams) {
    teamsByCode.set(team.code.toUpperCase(), team)
  }

  for (const team of upstreamTeams) {
    const code = toWorldRugbyTeamCode(team)
    if (!code) {
      continue
    }

    const existing = teamsByCode.get(code)
    const flagCode = WORLD_RUGBY_FLAG_BY_CODE[code] ?? code.slice(0, 2).toLowerCase()

    if (existing) {
      existing.name = team.name ?? existing.name
      existing.flagCode = WORLD_RUGBY_FLAG_BY_CODE[code] ?? (existing.flagCode || flagCode)
      continue
    }

    const nextTeam = {
      id: toWorldRugbyTeamId(team),
      code,
      name: team.name ?? code,
      flagCode,
    }
    mergedTeams.push(nextTeam)
    teamsByCode.set(code, nextTeam)
  }

  const existingMatchesById = new Map(data.matches.map((match) => [match.id, match]))
  const mergedMatches = [...data.matches]

  for (const upstreamMatch of scheduleMatches) {
    const matchId = String(upstreamMatch.matchAltId ?? upstreamMatch.matchId ?? '').trim()
    if (!matchId || existingMatchesById.has(matchId)) {
      continue
    }

    const homeTeam = Array.isArray(upstreamMatch.teams) ? upstreamMatch.teams[0] : undefined
    const awayTeam = Array.isArray(upstreamMatch.teams) ? upstreamMatch.teams[1] : undefined
    const homeCode = homeTeam ? toWorldRugbyTeamCode(homeTeam) : ''
    const awayCode = awayTeam ? toWorldRugbyTeamCode(awayTeam) : ''
    const kickoffMillis = upstreamMatch.time?.millis
    const kickoff = typeof kickoffMillis === 'number' && Number.isFinite(kickoffMillis)
      ? new Date(kickoffMillis).toISOString()
      : new Date().toISOString()
    const status = normalizeWorldRugbyStatus(upstreamMatch.status, upstreamMatch.clock?.secs)
    const scores = Array.isArray(upstreamMatch.scores) ? upstreamMatch.scores : []
    const homeScore = normalizeScore(scores[0])
    const awayScore = normalizeScore(scores[1])

    const nextMatch: MatchRecord = {
      id: matchId,
      stage: 'group',
      home: {
        teamId: homeCode ? teamsByCode.get(homeCode)?.id : undefined,
        ...(homeScore !== undefined ? { score: homeScore } : {}),
      },
      away: {
        teamId: awayCode ? teamsByCode.get(awayCode)?.id : undefined,
        ...(awayScore !== undefined ? { score: awayScore } : {}),
      },
      kickoff,
      venue: {
        stadium: upstreamMatch.venue?.name ?? '',
        city: upstreamMatch.venue?.city ?? '',
        country: upstreamMatch.venue?.country ?? '',
        timeZone: 'UTC',
      },
      status,
      live: status !== 'scheduled'
        ? {
            detail: upstreamMatch.status,
            displayClock: upstreamMatch.clock?.label,
          }
        : undefined,
    }

    mergedMatches.push(nextMatch)
    existingMatchesById.set(nextMatch.id, nextMatch)
  }

  const standingsTables = payload.standings.tables ?? []
  const mergedGroups = standingsTables.map((table, index) => {
    const rows = table.entries ?? table.rows ?? table.teams ?? []
    const teamIds = rows
      .map((row) => (row.team?.abbreviation ?? row.abbreviation ?? row.code ?? '').trim().toUpperCase())
      .map((code) => teamsByCode.get(code)?.id)
      .filter((teamId): teamId is string => typeof teamId === 'string')
    const teamIdSet = new Set(teamIds)
    const groupId = String(table.id ?? `group-${index + 1}`)
    const standings = rows
      .map((row) => {
        const code = (row.team?.abbreviation ?? row.abbreviation ?? row.code ?? '').trim().toUpperCase()
        const teamId = teamsByCode.get(code)?.id
        if (!teamId) {
          return null
        }

        return {
          teamId,
          played: toNumberOrZero(row.played ?? row.p),
          won: toNumberOrZero(row.won ?? row.w),
          drawn: toNumberOrZero(row.drawn ?? row.d),
          lost: toNumberOrZero(row.lost ?? row.l),
          goalsFor: toNumberOrZero(row.pointsFor ?? row.pf),
          goalsAgainst: toNumberOrZero(row.pointsAgainst ?? row.pa),
          points: toNumberOrZero(row.points ?? row.pts),
        }
      })
      .filter((standing): standing is TournamentData['groups'][number]['standings'][number] => standing !== null)

    return {
      id: groupId,
      label: table.label ?? table.name ?? `Group ${index + 1}`,
      teamIds,
      standings,
      matchIds: mergedMatches
        .filter((match) => match.stage === 'group' && teamIdSet.has(match.home.teamId ?? '') && teamIdSet.has(match.away.teamId ?? ''))
        .map((match) => match.id),
    }
  })
  const fallbackTeamIds = mergedTeams.map((team) => team.id)
  const fallbackGroups = fallbackTeamIds.length > 0
    ? [{
        id: 'group-1',
        label: 'Pool 1',
        teamIds: fallbackTeamIds,
        standings: fallbackTeamIds.map((teamId) => ({
          teamId,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
        })),
        matchIds: mergedMatches
          .filter((match) => match.stage === 'group')
          .map((match) => match.id),
      }]
    : []

  return {
    ...data,
    meta: {
      ...data.meta,
      edition: payload.schedule.event?.label ?? data.meta.edition,
    },
    teams: mergedTeams,
    groups: mergedGroups.length > 0 ? mergedGroups : fallbackGroups.length > 0 ? fallbackGroups : data.groups,
    matches: mergedMatches,
  }
}

const toWorldRugbyMatchUpdates = (payload: WorldRugbySchedulePayload, data: TournamentData): UpstreamMatchUpdate[] => {
  const teamIdByCode = new Map(data.teams.map((team) => [team.code.toUpperCase(), team.id]))
  const updates: UpstreamMatchUpdate[] = []
  const syncedAt = new Date().toISOString()

  for (const match of payload.matches ?? []) {
    const matchId = String(match.matchAltId ?? match.matchId ?? '').trim()
    if (!matchId) {
      continue
    }

    const teams = Array.isArray(match.teams) ? match.teams : []
    const homeTeam = teams[0]
    const awayTeam = teams[1]
    const homeCode = homeTeam ? toWorldRugbyTeamCode(homeTeam) : ''
    const awayCode = awayTeam ? toWorldRugbyTeamCode(awayTeam) : ''
    const status = normalizeWorldRugbyStatus(match.status, match.clock?.secs)
    const scores = Array.isArray(match.scores) ? match.scores : []

    updates.push({
      id: matchId,
      status,
      homeScore: status === 'live' || status === 'finished' ? normalizeScore(scores[0]) : undefined,
      awayScore: status === 'live' || status === 'finished' ? normalizeScore(scores[1]) : undefined,
      homeTeamId: homeCode ? teamIdByCode.get(homeCode) ?? homeCode.toLowerCase() : undefined,
      awayTeamId: awayCode ? teamIdByCode.get(awayCode) ?? awayCode.toLowerCase() : undefined,
      live: status !== 'scheduled'
        ? {
            detail: match.status,
            displayClock: match.clock?.label,
            clock: match.clock?.secs,
            syncedAt,
          }
        : undefined,
    })
  }

  return updates
}

const toMatchUpdates = (payload: unknown, data: TournamentData): UpstreamMatchUpdate[] => {
  if (isWorldRugbySyncPayload(payload)) {
    return toWorldRugbyMatchUpdates(payload.schedule, data)
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as EspnPayload).events)) {
    return toEspnMatchUpdates(payload as EspnPayload, data)
  }

  if (isWorldRugbySchedulePayload(payload)) {
    return toWorldRugbyMatchUpdates(payload, data)
  }

  if (Array.isArray(payload)) {
    return payload as UpstreamMatchUpdate[]
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { matches?: unknown[] }).matches)) {
    return (payload as { matches: UpstreamMatchUpdate[] }).matches
  }

  return []
}

const normalizeStatus = (status: unknown): MatchRecord['status'] | undefined => {
  if (status === 'live' || status === 'finished' || status === 'scheduled') {
    return status
  }

  return undefined
}

const normalizeScore = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value)
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)

    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed)
    }
  }

  return undefined
}

type NormalizedUpdate = {
  id: string
  status?: MatchRecord['status']
  homeScore?: number
  awayScore?: number
  homePenaltyScore?: number
  awayPenaltyScore?: number
  homeTeamId?: string
  awayTeamId?: string
  live?: Partial<MatchLiveRecord>
}

const toNormalizedUpdate = (entry: UpstreamMatchUpdate): NormalizedUpdate => {
  const homeScore = normalizeScore(entry.homeScore ?? entry.home?.score ?? entry.score?.home)
  const awayScore = normalizeScore(entry.awayScore ?? entry.away?.score ?? entry.score?.away)
  const homePenaltyScore = normalizeScore(entry.homePenaltyScore ?? entry.home?.penaltyScore)
  const awayPenaltyScore = normalizeScore(entry.awayPenaltyScore ?? entry.away?.penaltyScore)

  return {
    id: entry.id,
    status: normalizeStatus(entry.status),
    homeScore,
    awayScore,
    homePenaltyScore,
    awayPenaltyScore,
    homeTeamId: typeof entry.homeTeamId === 'string' ? entry.homeTeamId : undefined,
    awayTeamId: typeof entry.awayTeamId === 'string' ? entry.awayTeamId : undefined,
    live: entry.live
      ? {
          state: typeof entry.live.state === 'string' ? (entry.live.state as MatchLiveRecord['state']) : undefined,
          period: typeof entry.live.period === 'number' ? Math.trunc(entry.live.period) : undefined,
          clock: typeof entry.live.clock === 'number' ? Math.trunc(entry.live.clock) : undefined,
          displayClock: typeof entry.live.displayClock === 'string' ? entry.live.displayClock : undefined,
          detail: typeof entry.live.detail === 'string' ? entry.live.detail : undefined,
          shortDetail: typeof entry.live.shortDetail === 'string' ? entry.live.shortDetail : undefined,
          completed: typeof entry.live.completed === 'boolean' ? entry.live.completed : undefined,
          startDate: typeof entry.live.startDate === 'string' ? entry.live.startDate : undefined,
          firstSeenLiveAt: typeof entry.live.firstSeenLiveAt === 'string' ? entry.live.firstSeenLiveAt : undefined,
          syncedAt: typeof entry.live.syncedAt === 'string' ? entry.live.syncedAt : undefined,
        }
      : undefined,
  }
}

const hasNumericScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export const recomputeGroups = (groups: TournamentData['groups'], matches: TournamentData['matches']) => {
  return groups.map((group) => {
    const byTeamId = new Map(
      group.teamIds.map((teamId) => [
        teamId,
        {
          teamId,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
        },
      ]),
    )

    const groupTeamIds = new Set(group.teamIds)
    const isGroupMatch = (match: TournamentData['matches'][number]) => {
      if (match.stage !== 'group' || match.status !== 'finished') {
        return false
      }

      if (match.groupId === group.id) {
        return true
      }

      return (
        typeof match.home?.teamId === 'string' &&
        typeof match.away?.teamId === 'string' &&
        groupTeamIds.has(match.home.teamId) &&
        groupTeamIds.has(match.away.teamId)
      )
    }

    for (const match of matches) {
      if (!isGroupMatch(match)) {
        continue
      }

      const homeId = match.home?.teamId
      const awayId = match.away?.teamId
      const homeScore = match.home?.score
      const awayScore = match.away?.score

      if (!homeId || !awayId || !byTeamId.has(homeId) || !byTeamId.has(awayId)) {
        continue
      }

      if (!hasNumericScore(homeScore) || !hasNumericScore(awayScore)) {
        continue
      }

      const home = byTeamId.get(homeId)
      const away = byTeamId.get(awayId)

      if (!home || !away) {
        continue
      }

      home.played += 1
      away.played += 1
      home.goalsFor += homeScore
      home.goalsAgainst += awayScore
      away.goalsFor += awayScore
      away.goalsAgainst += homeScore

      if (homeScore > awayScore) {
        home.won += 1
        away.lost += 1
        home.points += 3
      } else if (homeScore < awayScore) {
        away.won += 1
        home.lost += 1
        away.points += 3
      } else {
        home.drawn += 1
        away.drawn += 1
        home.points += 1
        away.points += 1
      }
    }

    const originalOrder = new Map(group.standings.map((standing, index) => [standing.teamId, index]))
    const standings = sortGroupStandings({
      standings: [...byTeamId.values()],
      matches: matches.filter(isGroupMatch),
      originalOrder,
    })

    return {
      ...group,
      standings,
    }
  })
}

export const runTournamentSync = async ({ headers }: SyncInput): Promise<SyncResult | SyncError> => {
  const vercelCronHeader = headers['x-vercel-cron']
  const authorization = headers.authorization ?? headers.Authorization
  const isVercelCronCall = typeof vercelCronHeader === 'string' && vercelCronHeader.length > 0
  const isVercelRuntime = process.env.VERCEL === '1' || typeof process.env.VERCEL_ENV === 'string'
  const cronSecret = process.env.CRON_SECRET

  if (!isVercelCronCall && cronSecret) {
    if (authorization !== `Bearer ${cronSecret}`) {
      return { status: 401, body: { error: 'Unauthorized cron call' } }
    }
  }

  if (isVercelRuntime && !process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      status: 500,
      body: {
        error: 'BLOB_READ_WRITE_TOKEN is not configured',
        details: 'Cron updates cannot be persisted on Vercel without Blob storage token.',
      },
    }
  }

  const competition = getActiveCompetitionProfile()
  const resultsUrl = process.env.MATCH_RESULTS_URL ?? competition.defaultMatchResultsUrl

  if (!resultsUrl) {
    return {
      status: 500,
      body: {
        error: 'MATCH_RESULTS_URL is not configured',
        details: `Set MATCH_RESULTS_URL for ${competition.id} before running sync.`,
      },
    }
  }

  try {
    const currentData = await loadTournamentData()
    const payload = await fetchMatchResultsPayload(resultsUrl, currentData)
    const syncedData = isWorldRugbySyncPayload(payload) ? buildWorldRugbyCatalog(currentData, payload) : currentData
    const updates = toMatchUpdates(payload, syncedData)
    const updateMap = new Map(
      updates
        .filter((entry) => entry && typeof entry.id === 'string')
        .map((entry) => {
          const normalized = toNormalizedUpdate(entry)
          return [normalized.id, normalized]
        }),
    )

    let updatedCount = 0

    const nextMatches = syncedData.matches.map((match) => {
      const update = updateMap.get(match.id)

      if (!update) {
        return match
      }

      const nextStatus = update.status ?? match.status
      const nextHomeScore = update.homeScore
      const nextAwayScore = update.awayScore
      const nextHomePenaltyScore = update.homePenaltyScore
      const nextAwayPenaltyScore = update.awayPenaltyScore
      const nextLive = update.live
      const homeScoreChanged = nextHomeScore !== undefined && nextHomeScore !== match.home?.score
      const awayScoreChanged = nextAwayScore !== undefined && nextAwayScore !== match.away?.score
      const homePenaltyScoreChanged = nextHomePenaltyScore !== undefined && nextHomePenaltyScore !== match.home?.penaltyScore
      const awayPenaltyScoreChanged = nextAwayPenaltyScore !== undefined && nextAwayPenaltyScore !== match.away?.penaltyScore
      const statusChanged = nextStatus !== match.status
      const homeTeamChanged = update.homeTeamId !== undefined && !!match.home && !match.home.teamId
      const awayTeamChanged = update.awayTeamId !== undefined && !!match.away && !match.away.teamId
      const mergedLive =
        nextLive !== undefined
          ? {
              ...nextLive,
              firstSeenLiveAt: match.live?.firstSeenLiveAt ?? (nextStatus === 'live' ? new Date().toISOString() : undefined),
            }
          : nextStatus === 'scheduled'
            ? undefined
            : match.live
      const liveChanged = JSON.stringify(mergedLive ?? null) !== JSON.stringify(match.live ?? null)

      if (!statusChanged && !homeScoreChanged && !awayScoreChanged && !homePenaltyScoreChanged && !awayPenaltyScoreChanged && !liveChanged && !homeTeamChanged && !awayTeamChanged) {
        return match
      }

      updatedCount += 1

      return {
        ...match,
        status: nextStatus,
        home: {
          ...match.home,
          ...(nextHomeScore !== undefined ? { score: nextHomeScore } : {}),
          ...(nextHomePenaltyScore !== undefined ? { penaltyScore: nextHomePenaltyScore } : {}),
          ...(homeTeamChanged ? { teamId: update.homeTeamId } : {}),
        },
        away: {
          ...match.away,
          ...(nextAwayScore !== undefined ? { score: nextAwayScore } : {}),
          ...(nextAwayPenaltyScore !== undefined ? { penaltyScore: nextAwayPenaltyScore } : {}),
          ...(awayTeamChanged ? { teamId: update.awayTeamId } : {}),
        },
        live: mergedLive,
      }
    })

    const payloadUpdatedAt = payload && typeof payload === 'object' ? (payload as { updatedAt?: string }).updatedAt : undefined

    const shouldPreserveProviderStandings =
      usesStandingsSectionPath(competition.id)
      && isWorldRugbySyncPayload(payload)
      && hasWorldRugbyStandingsRows(payload.standings.tables)
    const recomputedGroups = shouldPreserveProviderStandings ? syncedData.groups : recomputeGroups(syncedData.groups, nextMatches)
    const resolvedMatches = resolveGroupBracketTeams(nextMatches, recomputedGroups, syncedData.bracketRounds)

    const nextData: TournamentData = {
      ...syncedData,
      meta: {
        ...syncedData.meta,
        updatedAt: typeof payloadUpdatedAt === 'string' ? payloadUpdatedAt : new Date().toISOString(),
      },
      matches: resolvedMatches,
      groups: recomputedGroups,
    }

    await saveTournamentData(nextData)
    await scoreFinishedMatches(nextData)

    return {
      ok: true,
      scanned: updates.length,
      updated: updatedCount,
      storedAt: nextData.meta.updatedAt,
    }
  } catch (error) {
    return {
      status: 500,
      body: {
        error: 'Match sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}
