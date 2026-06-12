import fs from 'node:fs/promises'
import path from 'node:path'
import { head, put } from '@vercel/blob'

const TOURNAMENT_BLOB_PATH = 'worldcup/worldcup.json'

const resolveLocalDataPath = () => path.join(process.cwd(), 'src', 'data', 'worldcup.json')

export const readLocalTournamentData = async () => {
  const filePath = resolveLocalDataPath()
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

export const writeLocalTournamentData = async (data) => {
  const filePath = resolveLocalDataPath()
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

export const loadTournamentData = async () => {
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

    return response.json()
  } catch {
    return readLocalTournamentData()
  }
}

export const saveTournamentData = async (data) => {
  const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN

  if (!blobReadWriteToken) {
    await writeLocalTournamentData(data)
    return
  }

  const configuredAccess = (process.env.BLOB_OBJECT_ACCESS ?? '').toLowerCase()
  const primaryAccess = configuredAccess === 'public' ? 'public' : 'private'
  const fallbackAccess = primaryAccess === 'public' ? 'private' : 'public'
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
