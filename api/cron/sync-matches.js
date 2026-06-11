import { loadTournamentData, saveTournamentData } from '../_lib/tournament-data.js'

const DEFAULT_MATCH_RESULTS_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

const normalizeEspnState = (state, completed) => {
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

const buildMatchIndexes = (data) => {
  const teamCodeById = new Map(data.teams.map((team) => [team.id, team.code]))
  const byExact = new Map()
  const byPair = new Map()

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

const toEspnMatchUpdates = (payload, data) => {
  if (!payload || !Array.isArray(payload.events)) {
    return []
  }

  const { byExact, byPair } = buildMatchIndexes(data)
  const updates = []

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
    const matchId = byExact.get(exactKey) ?? (byPair.get(pairKey)?.length === 1 ? byPair.get(pairKey)[0] : undefined)

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
    })
  }

  return updates
}

const toMatchUpdates = (payload, data) => {
  if (payload && Array.isArray(payload.events)) {
    return toEspnMatchUpdates(payload, data)
  }

  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && Array.isArray(payload.matches)) {
    return payload.matches
  }

  return []
}

const normalizeStatus = (status) => {
  if (status === 'live' || status === 'finished' || status === 'scheduled') {
    return status
  }

  return undefined
}

const normalizeScore = (value) => {
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

const toNormalizedUpdate = (entry) => {
  const homeScore = normalizeScore(entry.homeScore ?? entry.home?.score ?? entry.score?.home)
  const awayScore = normalizeScore(entry.awayScore ?? entry.away?.score ?? entry.score?.away)

  return {
    id: entry.id,
    status: normalizeStatus(entry.status),
    homeScore,
    awayScore,
  }
}

const hasNumericScore = (value) => typeof value === 'number' && Number.isFinite(value)

const recomputeGroups = (groups, matches) => {
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

export default async function handler(request, response) {
  const isVercelCronCall = typeof request.headers['x-vercel-cron'] === 'string'
  const isVercelRuntime = process.env.VERCEL === '1' || typeof process.env.VERCEL_ENV === 'string'
  const cronSecret = process.env.CRON_SECRET

  if (!isVercelCronCall && cronSecret) {
    const authorization = request.headers.authorization ?? ''

    if (authorization !== `Bearer ${cronSecret}`) {
      return response.status(401).json({ error: 'Unauthorized cron call' })
    }
  }

  if (isVercelRuntime && !process.env.BLOB_READ_WRITE_TOKEN) {
    return response.status(500).json({
      error: 'BLOB_READ_WRITE_TOKEN is not configured',
      details: 'Cron updates cannot be persisted on Vercel without Blob storage token.',
    })
  }

  const resultsUrl = process.env.MATCH_RESULTS_URL ?? DEFAULT_MATCH_RESULTS_URL

  try {
    const currentData = await loadTournamentData()
    const upstreamResponse = await fetch(resultsUrl, { cache: 'no-store' })

    if (!upstreamResponse.ok) {
      return response
        .status(502)
        .json({ error: `Failed to fetch match results (${upstreamResponse.status})` })
    }

    const payload = await upstreamResponse.json()
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
      const homeScoreChanged = nextHomeScore !== undefined && nextHomeScore !== match.home?.score
      const awayScoreChanged = nextAwayScore !== undefined && nextAwayScore !== match.away?.score
      const statusChanged = nextStatus !== match.status

      if (!statusChanged && !homeScoreChanged && !awayScoreChanged) {
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
      }
    })

    const nextData = {
      ...currentData,
      meta: {
        ...currentData.meta,
        updatedAt: typeof payload?.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
      },
      matches: nextMatches,
      groups: recomputeGroups(currentData.groups, nextMatches),
    }

    await saveTournamentData(nextData)

    return response.status(200).json({
      ok: true,
      scanned: updates.length,
      updated: updatedCount,
      storedAt: nextData.meta.updatedAt,
    })
  } catch (error) {
    return response.status(500).json({
      error: 'Match sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
