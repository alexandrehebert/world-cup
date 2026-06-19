import { NextResponse } from 'next/server'
import { getUserByUsername, listLeaderboard, listPredictionsByUser } from '../../../../server/kv-store'

type RouteContext = {
  params: Promise<{ username: string }>
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { username } = await context.params
    const requestedUsername = String(username ?? '').trim()

    if (!requestedUsername) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const user = await getUserByUsername(requestedUsername)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const [predictions, leaderboard] = await Promise.all([
      listPredictionsByUser(user.id),
      listLeaderboard(),
    ])

    const rankIndex = leaderboard.findIndex((entry) => entry.userId === user.id)
    const rankedEntry = rankIndex >= 0 ? leaderboard[rankIndex] : undefined
    const rank = rankIndex >= 0 ? rankIndex + 1 : leaderboard.length + 1
    const points = rankedEntry?.points ?? predictions.reduce((total, prediction) => total + prediction.pointsAwarded, 0)

    return NextResponse.json(
      {
        username: user.username,
        rank,
        points,
        predictionsCount: rankedEntry?.predictionsCount ?? predictions.length,
        predictions,
      },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ error: 'Unable to load user profile' }, { status: 500 })
  }
}
