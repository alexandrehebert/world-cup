export interface EspnLinescore {
  points?: number
  period?: {
    type?: {
      name?: string
    }
  }
}

export interface EspnCompetitor {
  homeAway?: string
  score?: string | number
  linescores?: EspnLinescore[] | null
  team?: {
    id?: string
    abbreviation?: string
    displayName?: string
    name?: string
  }
}

export interface EspnCompetition {
  startDate?: string
  status?: {
    period?: number
    clock?: number
    displayClock?: string
    type?: {
      state?: string
      completed?: boolean
      name?: string
      description?: string
      detail?: string
      shortDetail?: string
    }
  }
  competitors?: EspnCompetitor[]
}

export interface EspnEvent {
  id?: string
  date?: string
  competitions?: EspnCompetition[]
}

export interface EspnPayload {
  updatedAt?: string
  events?: EspnEvent[]
}

interface EspnShootoutShot {
  didScore?: boolean
}

interface EspnShootoutEntry {
  id?: string
  shots?: EspnShootoutShot[]
}

export interface EspnSummary {
  shootout?: EspnShootoutEntry[]
}

const SHOOTOUT_LINESCORE_NAME = 'shootout'

const hasPenaltyShootoutMarker = (value: string | undefined) => {
  if (!value) return false

  const normalized = value.toLowerCase()
  return normalized.includes('pen') || normalized.includes('shootout')
}

export const isPenaltyShootoutCompetition = (competition: EspnCompetition | undefined) => {
  const statusType = competition?.status?.type
  if (!statusType) return false

  return (
    hasPenaltyShootoutMarker(statusType.name) ||
    hasPenaltyShootoutMarker(statusType.description) ||
    hasPenaltyShootoutMarker(statusType.detail) ||
    hasPenaltyShootoutMarker(statusType.shortDetail)
  )
}

export const extractPenaltyScore = (competitor: EspnCompetitor): number | undefined => {
  const linescores = competitor.linescores
  if (!Array.isArray(linescores)) return undefined

  const penaltyLinescore = linescores.find((linescore) => {
    const name = linescore?.period?.type?.name?.toLowerCase() ?? ''
    return (
      name === 'penalty' ||
      name === 'shootout' ||
      name === 'penalty shootout' ||
      name === 'penaltyshootout'
    )
  })

  if (penaltyLinescore && typeof penaltyLinescore.points === 'number' && Number.isFinite(penaltyLinescore.points)) {
    return penaltyLinescore.points
  }

  return undefined
}

const countScoredShootoutAttempts = (entry: EspnShootoutEntry) =>
  Array.isArray(entry.shots) ? entry.shots.filter((shot) => shot?.didScore === true).length : undefined

export const mergeEspnSummaryShootoutScores = (event: EspnEvent, summary: EspnSummary): EspnEvent => {
  const primaryCompetition = Array.isArray(event.competitions) ? event.competitions[0] : undefined
  const competitors = primaryCompetition?.competitors
  if (!primaryCompetition || !Array.isArray(competitors) || competitors.length === 0) {
    return event
  }

  const shootoutScoresByTeamId = new Map(
    (summary.shootout ?? [])
      .map((entry) => {
        const score = countScoredShootoutAttempts(entry)
        return entry.id && score !== undefined ? [entry.id, score] as const : undefined
      })
      .filter((entry): entry is readonly [string, number] => Boolean(entry)),
  )

  if (shootoutScoresByTeamId.size === 0) {
    return event
  }

  let didChange = false

  const nextCompetitors = competitors.map((competitor) => {
    if (extractPenaltyScore(competitor) !== undefined) {
      return competitor
    }

    const teamId = competitor.team?.id
    if (!teamId) {
      return competitor
    }

    const shootoutScore = shootoutScoresByTeamId.get(teamId)
    if (shootoutScore === undefined) {
      return competitor
    }

    didChange = true

    return {
      ...competitor,
      linescores: [
        ...(Array.isArray(competitor.linescores) ? competitor.linescores : []),
        {
          points: shootoutScore,
          period: {
            type: {
              name: SHOOTOUT_LINESCORE_NAME,
            },
          },
        },
      ],
    }
  })

  if (!didChange) {
    return event
  }

  return {
    ...event,
    competitions: [
      {
        ...primaryCompetition,
        competitors: nextCompetitors,
      },
      ...(event.competitions?.slice(1) ?? []),
    ],
  }
}
