import { NextResponse } from 'next/server'
import { loadTournamentData } from '../../../server/tournament-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await loadTournamentData()
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
