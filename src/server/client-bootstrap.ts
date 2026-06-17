import { cookies } from 'next/headers'
import { parseSessionToken, sessionCookieName } from './auth'
import { getUserById, listLeaderboard, listPredictionDistributions, listPredictionsByUser } from './kv-store'
import { loadTournamentData } from './tournament-data'
import type { ClientBootstrapData } from '../types/bootstrap'

const DEFAULT_LEADERBOARD_LIMIT = 100

export const loadClientBootstrapData = async (): Promise<ClientBootstrapData> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(sessionCookieName)?.value
  const session = parseSessionToken(token)
  const storedUser = session ? await getUserById(session.id).catch(() => null) : null

  const [initialPredictions, initialPredictionDistributions]: [
    ClientBootstrapData['initialPredictions'],
    ClientBootstrapData['initialPredictionDistributions'],
  ] = session
    ? await Promise.all([
        listPredictionsByUser(session.id).catch(() => []),
        loadTournamentData()
          .then((tournamentData) => {
            const openMatchIds = tournamentData.matches
              .filter((match) => match.status === 'scheduled' && new Date(match.kickoff).getTime() > Date.now())
              .map((match) => match.id)
            return listPredictionDistributions(openMatchIds)
          })
          .catch(() => []),
      ])
    : [[], []]
  const initialLeaderboard: ClientBootstrapData['initialLeaderboard'] = await listLeaderboard()
    .then((leaderboard) =>
      leaderboard.slice(0, DEFAULT_LEADERBOARD_LIMIT).map((entry, index) => ({
        rank: index + 1,
        ...entry,
      })),
    )
    .catch(() => [])

  return {
    sessionResolved: true,
    initialUser: storedUser
      ? {
          id: storedUser.id,
          username: storedUser.username,
          preferences: storedUser.preferences ?? {},
        }
      : session ?? null,
    initialPredictions,
    initialPredictionDistributions,
    initialLeaderboard,
  }
}
