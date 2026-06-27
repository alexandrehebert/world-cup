import { NextResponse } from 'next/server'
import { normalizeUsernameInput, setAuthCookie, verifyPassword } from '../../../../server/auth'
import { getUserByUsername } from '../../../../server/kv-store'
import {
  LOCALE_COOKIE_NAME,
  THEME_PREFERENCE_COOKIE_NAME,
  isLocaleCode,
  isThemePreference,
} from '../../../../lib/user-preferences'

type LoginBody = {
  username?: string
  password?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody
    const username = normalizeUsernameInput(body.username ?? '')
    const password = body.password ?? ''
    const user = await getUserByUsername(username)

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          preferences: user.preferences ?? {},
        },
      },
      { status: 200 },
    )
    setAuthCookie(response, { id: user.id, username: user.username })
    const localePreference = user.preferences?.locale
    if (isLocaleCode(localePreference)) {
      response.cookies.set({
        name: LOCALE_COOKIE_NAME,
        value: localePreference,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      })
    }
    const themePreference = user.preferences?.themePreference
    if (isThemePreference(themePreference)) {
      response.cookies.set({
        name: THEME_PREFERENCE_COOKIE_NAME,
        value: themePreference,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      })
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Unable to log in' }, { status: 500 })
  }
}
