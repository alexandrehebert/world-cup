import { NextRequest, NextResponse } from 'next/server'
import { parseSessionToken, sessionCookieName } from '../../../../server/auth'
import { getUserById } from '../../../../server/kv-store'
import { isAccountFeatureEnabled } from '../../../../lib/features'

export async function GET(request: NextRequest) {
  if (!isAccountFeatureEnabled) {
    return NextResponse.json({ error: 'Account feature is disabled' }, { status: 404 })
  }

  const token = request.cookies.get(sessionCookieName)?.value
  const session = parseSessionToken(token)

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  const user = await getUserById(session.id)

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        username: user.username,
        preferences: user.preferences ?? {},
      },
    },
    { status: 200 },
  )
}
