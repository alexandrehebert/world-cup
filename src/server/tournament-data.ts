import fs from 'node:fs/promises'
import path from 'node:path'
import { head, put } from '@vercel/blob'
import type { TournamentData } from '../types/tournament'

const TOURNAMENT_BLOB_PATH = 'worldcup/worldcup.json'

const resolveLocalDataPath = () => path.join(process.cwd(), 'src', 'data', 'worldcup.json')

export const readLocalTournamentData = async (): Promise<TournamentData> => {
  const filePath = resolveLocalDataPath()
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw) as TournamentData
}

export const writeLocalTournamentData = async (data: TournamentData) => {
  const filePath = resolveLocalDataPath()
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

export const applyCanonicalVenueData = (data: TournamentData, canonical: TournamentData): TournamentData => {
  const venueByMatchId = new Map(canonical.matches.map((match) => [match.id, match.venue]))
  let hasVenueChanges = false

  const nextMatches = data.matches.map((match) => {
    const canonicalVenue = venueByMatchId.get(match.id)
    if (!canonicalVenue) {
      return match
    }

    const isSameVenue =
      match.venue.stadium === canonicalVenue.stadium
      && match.venue.city === canonicalVenue.city
      && match.venue.country === canonicalVenue.country
      && match.venue.timeZone === canonicalVenue.timeZone

    if (isSameVenue) {
      return match
    }

    hasVenueChanges = true
    return {
      ...match,
      venue: canonicalVenue,
    }
  })

  if (!hasVenueChanges) {
    return data
  }

  return {
    ...data,
    matches: nextMatches,
  }
}

export const loadTournamentData = async (): Promise<TournamentData> => {
  const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN

  if (!blobReadWriteToken) {
    return readLocalTournamentData()
  }

  try {
    const blob = await head(TOURNAMENT_BLOB_PATH)
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
      readLocalTournamentData(),
    ])
    return applyCanonicalVenueData(blobData, localData)
  } catch {
    return readLocalTournamentData()
  }
}

export const saveTournamentData = async (data: TournamentData) => {
  const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN

  if (!blobReadWriteToken) {
    await writeLocalTournamentData(data)
    return
  }

  const configuredAccess = (process.env.BLOB_OBJECT_ACCESS ?? '').toLowerCase()
  const primaryAccess: 'public' | 'private' = configuredAccess === 'public' ? 'public' : 'private'
  const fallbackAccess: 'public' | 'private' = primaryAccess === 'public' ? 'private' : 'public'
  const body = JSON.stringify(data, null, 2)

  try {
    await put(TOURNAMENT_BLOB_PATH, body, {
      access: primaryAccess,
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
  } catch (primaryError) {
    try {
      await put(TOURNAMENT_BLOB_PATH, body, {
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
