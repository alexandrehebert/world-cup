import { NextRequest, NextResponse } from 'next/server'
import { listLeaderboard } from '../../../server/kv-store'
import { isPredictionsFeatureEnabled } from '../../../lib/features'

export async function GET(request: NextRequest) {
  if (!isPredictionsFeatureEnabled) {
    return NextResponse.json({ error: 'Predictions feature is disabled' }, { status: 404 })
  }

  try {
    const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? 100)
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.trunc(limitParam), 500) : 100
    const leaderboard = await listLeaderboard()

    return NextResponse.json(
      {
        leaderboard: leaderboard.slice(0, limit).map((entry, index) => ({
          rank: index + 1,
          ...entry,
        })),
      },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ error: 'Unable to load leaderboard' }, { status: 500 })
  }
}
