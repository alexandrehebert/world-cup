import type { MatchLiveRecord, MatchRecord, TournamentData } from '../types/tournament'
import { loadTournamentData, saveTournamentData } from './tournament-data'

const DEFAULT_MATCH_RESULTS_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

const toUtcDateKey = (date: Date) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const getEspnDateWindow = (now = new Date()) => {
  const offsets = [-1, 0, 1]
  return offsets.map((offset) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset))
    return toUtcDateKey(date)
  })
}

const isEspnScoreboardUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl)
    const isEspnHost = parsed.hostname.includes('espn.com')
    const isScoreboardPath = parsed.pathname.endsWith('/scoreboard')

    return isEspnHost && isScoreboardPath
  } catch {
    return false
  }
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

const fetchMatchResultsPayload = async (resultsUrl: string) => {
  if (!isEspnScoreboardUrl(resultsUrl)) {
    const response = await fetch(resultsUrl, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Failed to fetch match results (${response.status})`)
    }

    return await response.json()
  }

  const baseUrl = new URL(resultsUrl)
  const dateWindow = baseUrl.searchParams.get('dates') ? [baseUrl.searchParams.get('dates') as string] : getEspnDateWindow()
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

  return mergeEspnPayloads(payloads)
}

interface EspnCompetitor {
  homeAway?: string
  score?: string | number
  team?: {
    abbreviation?: string
  }
}

interface EspnCompetition {
  startDate?: string
  status?: {
    period?: number
    clock?: number
    displayClock?: string
    type?: {
      state?: string
      completed?: boolean
      detail?: string
      shortDetail?: string
    }
  }
  competitors?: EspnCompetitor[]
}

interface EspnEvent {
  date?: string
  competitions?: EspnCompetition[]
}

interface EspnPayload {
  updatedAt?: string
  events?: EspnEvent[]
}

type UpstreamMatchUpdate = {
  id: string
  status?: MatchRecord['status']
  homeScore?: number | string
  awayScore?: number | string
  home?: { score?: number | string }
  away?: { score?: number | string }
  score?: { home?: number | string; away?: number | string }
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

const buildMatchIndexes = (data: TournamentData) => {
  const teamCodeById = new Map(data.teams.map((team) => [team.id, team.code]))
  const byExact = new Map<string, string>()
  const byPair = new Map<string, string[]>()

  for (const match of data.matches) {
    const homeId = match.home?.teamId
    const awayId = match.away?.teamId

    if (!homeId || !awayId) {
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

  return { byExact, byPair }
}

const toEspnMatchUpdates = (payload: EspnPayload, data: TournamentData): UpstreamMatchUpdate[] => {
  if (!payload || !Array.isArray(payload.events)) {
    return []
  }

  const { byExact, byPair } = buildMatchIndexes(data)
  const updates: UpstreamMatchUpdate[] = []
  const syncedAt = new Date().toISOString()

  for (const event of payload.events) {
    const competition = Array.isArray(event?.competitions) ? event.competitions[0] : undefined
    const competitors = Array.isArray(competition?.competitors) ? competition.competitors : []
    const home = competitors.find((competitor) => competitor?.homeAway === 'home')
    const away = competitors.find((competitor) => competitor?.homeAway === 'away')
    const homeCode = home?.team?.abbreviation
    const awayCode = away?.team?.abbreviation

    if (!homeCode || !awayCode) {
      continue
    }

    const eventDay = typeof event?.date === 'string' ? new Date(event.date).toISOString().slice(0, 10) : ''
    const exactKey = `${homeCode}::${awayCode}::${eventDay}`
    const pairKey = `${homeCode}::${awayCode}`
    const pairMatches = byPair.get(pairKey)
    const matchId = byExact.get(exactKey) ?? (pairMatches?.length === 1 ? pairMatches[0] : undefined)

    if (!matchId) {
      continue
    }

    const nextStatus = normalizeEspnState(competition?.status?.type?.state, competition?.status?.type?.completed)
    const hasPlayableStatus = nextStatus === 'live' || nextStatus === 'finished'

    updates.push({
      id: matchId,
      status: nextStatus,
      homeScore: hasPlayableStatus ? home?.score : undefined,
      awayScore: hasPlayableStatus ? away?.score : undefined,
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

const toMatchUpdates = (payload: unknown, data: TournamentData): UpstreamMatchUpdate[] => {
  if (payload && typeof payload === 'object' && Array.isArray((payload as EspnPayload).events)) {
    return toEspnMatchUpdates(payload as EspnPayload, data)
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
  live?: Partial<MatchLiveRecord>
}

const toNormalizedUpdate = (entry: UpstreamMatchUpdate): NormalizedUpdate => {
  const homeScore = normalizeScore(entry.homeScore ?? entry.home?.score ?? entry.score?.home)
  const awayScore = normalizeScore(entry.awayScore ?? entry.away?.score ?? entry.score?.away)

  return {
    id: entry.id,
    status: normalizeStatus(entry.status),
    homeScore,
    awayScore,
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

const recomputeGroups = (groups: TournamentData['groups'], matches: TournamentData['matches']) => {
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

    for (const match of matches) {
      if (match.stage !== 'group' || match.groupId !== group.id || match.status !== 'finished') {
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

    const originalOrder = new Map(group.teamIds.map((teamId, index) => [teamId, index]))
    const standings = [...byTeamId.values()].sort((first, second) => {
      if (second.points !== first.points) {
        return second.points - first.points
      }

      const firstGoalDiff = first.goalsFor - first.goalsAgainst
      const secondGoalDiff = second.goalsFor - second.goalsAgainst

      if (secondGoalDiff !== firstGoalDiff) {
        return secondGoalDiff - firstGoalDiff
      }

      if (second.goalsFor !== first.goalsFor) {
        return second.goalsFor - first.goalsFor
      }

      return (originalOrder.get(first.teamId) ?? 0) - (originalOrder.get(second.teamId) ?? 0)
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

  const resultsUrl = process.env.MATCH_RESULTS_URL ?? DEFAULT_MATCH_RESULTS_URL

  try {
    const currentData = await loadTournamentData()
    const payload = await fetchMatchResultsPayload(resultsUrl)
    const updates = toMatchUpdates(payload, currentData)
    const updateMap = new Map(
      updates
        .filter((entry) => entry && typeof entry.id === 'string')
        .map((entry) => {
          const normalized = toNormalizedUpdate(entry)
          return [normalized.id, normalized]
        }),
    )

    let updatedCount = 0

    const nextMatches = currentData.matches.map((match) => {
      const update = updateMap.get(match.id)

      if (!update) {
        return match
      }

      const nextStatus = update.status ?? match.status
      const nextHomeScore = update.homeScore
      const nextAwayScore = update.awayScore
      const nextLive = update.live
      const homeScoreChanged = nextHomeScore !== undefined && nextHomeScore !== match.home?.score
      const awayScoreChanged = nextAwayScore !== undefined && nextAwayScore !== match.away?.score
      const statusChanged = nextStatus !== match.status
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

      if (!statusChanged && !homeScoreChanged && !awayScoreChanged && !liveChanged) {
        return match
      }

      updatedCount += 1

      return {
        ...match,
        status: nextStatus,
        home: {
          ...match.home,
          ...(nextHomeScore !== undefined ? { score: nextHomeScore } : {}),
        },
        away: {
          ...match.away,
          ...(nextAwayScore !== undefined ? { score: nextAwayScore } : {}),
        },
        live: mergedLive,
      }
    })

    const payloadUpdatedAt = payload && typeof payload === 'object' ? (payload as { updatedAt?: string }).updatedAt : undefined

    const nextData: TournamentData = {
      ...currentData,
      meta: {
        ...currentData.meta,
        updatedAt: typeof payloadUpdatedAt === 'string' ? payloadUpdatedAt : new Date().toISOString(),
      },
      matches: nextMatches,
      groups: recomputeGroups(currentData.groups, nextMatches),
    }

    await saveTournamentData(nextData)

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
