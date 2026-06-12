import { NextRequest, NextResponse } from 'next/server'
import { runTournamentSync } from '../../../../server/sync-matches'

export const dynamic = 'force-dynamic'

const toHeaderMap = (request: NextRequest) => Object.fromEntries(request.headers.entries())

export async function GET(request: NextRequest) {
  const result = await runTournamentSync({ headers: toHeaderMap(request) })

  if ('ok' in result) {
    return NextResponse.json(result, { status: 200 })
  }

  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(request: NextRequest) {
  const result = await runTournamentSync({ headers: toHeaderMap(request) })

  if ('ok' in result) {
    return NextResponse.json(result, { status: 200 })
  }

  return NextResponse.json(result.body, { status: result.status })
}
