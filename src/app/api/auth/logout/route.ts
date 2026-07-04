import { NextResponse } from 'next/server'
import { clearAuthCookie } from '../../../../server/auth'
import { isAccountFeatureEnabled } from '../../../../lib/features'

export async function POST() {
  if (!isAccountFeatureEnabled) {
    return NextResponse.json({ error: 'Account feature is disabled' }, { status: 404 })
  }

  const response = NextResponse.json({ ok: true }, { status: 200 })
  clearAuthCookie(response)
  return response
}
