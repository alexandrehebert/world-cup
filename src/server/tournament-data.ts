import fs from 'node:fs/promises'
import path from 'node:path'
import { head, put } from '@vercel/blob'
import { getActiveCompetitionProfile, getCompetitionProfile } from '../competitions'
import type { CompetitionId } from '../competitions/types'
import type { TournamentData } from '../types/tournament'

const LOCAL_TOURNAMENT_DATA_DIR = '.local-data/tournament'

const resolveLocalDataPath = (competitionId?: CompetitionId) => {
  const competition = competitionId ? getCompetitionProfile(competitionId) : getActiveCompetitionProfile()
  return path.join(process.cwd(), 'src', 'data', competition.localDataFile)
}

const resolveLocalRuntimeDataDir = () => {
  const configuredDir = (process.env.LOCAL_TOURNAMENT_DATA_DIR ?? '').trim()
  return configuredDir || LOCAL_TOURNAMENT_DATA_DIR
}

const resolveLocalRuntimeDataPath = (competitionId?: CompetitionId) => {
  const competition = competitionId ? getCompetitionProfile(competitionId) : getActiveCompetitionProfile()
  const runtimeDataDir = resolveLocalRuntimeDataDir()
  const runtimeBasePath = path.isAbsolute(runtimeDataDir) ? runtimeDataDir : path.join(process.cwd(), runtimeDataDir)
  return path.join(runtimeBasePath, competition.localDataFile)
}

const toCompetitionScopedData = (parsed: TournamentData, competitionId: CompetitionId): TournamentData => ({
  ...parsed,
  meta: {
    ...parsed.meta,
    competitionId,
  },
})

const readTournamentDataFromPath = async (filePath: string, competitionId: CompetitionId): Promise<TournamentData> => {
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw) as TournamentData
  return toCompetitionScopedData(parsed, competitionId)
}

const isMissingDataFileError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const code = (error as NodeJS.ErrnoException).code
  return code === 'ENOENT' || code === 'ENOTDIR'
}

export const readLocalTournamentData = async (competitionId?: CompetitionId): Promise<TournamentData> => {
  const competition = competitionId ? getCompetitionProfile(competitionId) : getActiveCompetitionProfile()
  const filePath = resolveLocalDataPath(competition.id)
  return readTournamentDataFromPath(filePath, competition.id)
}

const readLocalRuntimeTournamentData = async (competitionId?: CompetitionId): Promise<TournamentData> => {
  const competition = competitionId ? getCompetitionProfile(competitionId) : getActiveCompetitionProfile()
  const filePath = resolveLocalRuntimeDataPath(competition.id)

  try {
    return await readTournamentDataFromPath(filePath, competition.id)
  } catch (error) {
    if (isMissingDataFileError(error)) {
      return readLocalTournamentData(competition.id)
    }

    throw error
  }
}

export const writeLocalTournamentData = async (data: TournamentData) => {
  const filePath = resolveLocalRuntimeDataPath()
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

export const applyCanonicalVenueData = (data: TournamentData, canonical: TournamentData): TournamentData => {
  const canonicalMatchById = new Map(canonical.matches.map((match) => [match.id, match]))
  let hasChanges = false

  const nextMatches = data.matches.map((match) => {
    const canonicalMatch = canonicalMatchById.get(match.id)
    if (!canonicalMatch) {
      return match
    }

    const homeNeedsUpdate =
      match.home.placeholder !== canonicalMatch.home.placeholder ||
      (!!canonicalMatch.home.teamId && canonicalMatch.home.teamId !== match.home.teamId)
    const awayNeedsUpdate =
      match.away.placeholder !== canonicalMatch.away.placeholder ||
      (!!canonicalMatch.away.teamId && canonicalMatch.away.teamId !== match.away.teamId)

    const nextHome = homeNeedsUpdate ? { ...match.home } : match.home
    if (homeNeedsUpdate) {
      if (match.home.placeholder !== canonicalMatch.home.placeholder) {
        nextHome.placeholder = canonicalMatch.home.placeholder
      }
      if (canonicalMatch.home.teamId && canonicalMatch.home.teamId !== match.home.teamId) {
        nextHome.teamId = canonicalMatch.home.teamId
      }
    }

    const nextAway = awayNeedsUpdate ? { ...match.away } : match.away
    if (awayNeedsUpdate) {
      if (match.away.placeholder !== canonicalMatch.away.placeholder) {
        nextAway.placeholder = canonicalMatch.away.placeholder
      }
      if (canonicalMatch.away.teamId && canonicalMatch.away.teamId !== match.away.teamId) {
        nextAway.teamId = canonicalMatch.away.teamId
      }
    }

    const nextMatch = {
      ...match,
      venue:
        match.venue.stadium === canonicalMatch.venue.stadium
        && match.venue.city === canonicalMatch.venue.city
        && match.venue.country === canonicalMatch.venue.country
        && match.venue.timeZone === canonicalMatch.venue.timeZone
          ? match.venue
          : canonicalMatch.venue,
      home: nextHome,
      away: nextAway,
    }

    const hasMatchChanges =
      nextMatch.venue !== match.venue
      || nextMatch.home !== match.home
      || nextMatch.away !== match.away

    hasChanges ||= hasMatchChanges
    return nextMatch
  })

  if (!hasChanges) {
    return data
  }

  return {
    ...data,
    matches: nextMatches,
  }
}

export const loadTournamentData = async (competitionId?: CompetitionId): Promise<TournamentData> => {
  const competition = competitionId ? getCompetitionProfile(competitionId) : getActiveCompetitionProfile()
  const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN

  if (!blobReadWriteToken) {
    return readLocalRuntimeTournamentData(competition.id)
  }

  try {
    const blob = await head(competition.blobDataFile)
    const response = await fetch(blob.url, {
      cache: 'no-store',
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch blob data (${response.status})`)
    }

    const [blobData, localData] = await Promise.all([
      response.json() as Promise<TournamentData>,
      readLocalTournamentData(competition.id),
    ])
    const merged = applyCanonicalVenueData(blobData, localData)
    return {
      ...merged,
      meta: {
        ...merged.meta,
        competitionId: competition.id,
      },
    }
  } catch {
    return readLocalTournamentData(competition.id)
  }
}

export const saveTournamentData = async (data: TournamentData) => {
  const competition = getActiveCompetitionProfile()
  const normalizedData: TournamentData = {
    ...data,
    meta: {
      ...data.meta,
      competitionId: competition.id,
    },
  }
  const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN

  if (!blobReadWriteToken) {
    await writeLocalTournamentData(normalizedData)
    return
  }

  const configuredAccess = (process.env.BLOB_OBJECT_ACCESS ?? '').toLowerCase()
  const primaryAccess: 'public' | 'private' = configuredAccess === 'public' ? 'public' : 'private'
  const fallbackAccess: 'public' | 'private' = primaryAccess === 'public' ? 'private' : 'public'
  const body = JSON.stringify(normalizedData, null, 2)

  try {
    await put(competition.blobDataFile, body, {
      access: primaryAccess,
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
  } catch (primaryError) {
    try {
      await put(competition.blobDataFile, body, {
        access: fallbackAccess,
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      })
    } catch {
      throw primaryError
    }
  }
}
