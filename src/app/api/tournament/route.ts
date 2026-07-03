import { NextResponse } from 'next/server'
import { parseCompetitionId } from '../../../competitions'
import { loadTournamentData } from '../../../server/tournament-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const competitionIdParam = requestUrl.searchParams.get('competitionId') ?? undefined
    const competitionId = parseCompetitionId(competitionIdParam)

    if (competitionIdParam && !competitionId) {
      return NextResponse.json(
        {
          error: 'Invalid competitionId query parameter',
          details: 'competitionId must match a known competition profile id',
        },
        { status: 400 },
      )
    }

    const data = await loadTournamentData(competitionId)
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unable to load tournament data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
