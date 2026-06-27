import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  hashPassword,
  isPasswordValid,
  isUsernameValid,
  normalizeUsernameInput,
  setAuthCookie,
} from '../../../../server/auth'
import { createUser } from '../../../../server/kv-store'
import {
  LOCALE_COOKIE_NAME,
  THEME_PREFERENCE_COOKIE_NAME,
  isLocaleCode,
  isThemePreference,
} from '../../../../lib/user-preferences'

type RegisterBody = {
  username?: string
  password?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody
    const username = normalizeUsernameInput(body.username ?? '')
    const password = body.password ?? ''

    if (!isUsernameValid(username)) {
      return NextResponse.json({ error: 'Invalid username format' }, { status: 400 })
    }

    if (!isPasswordValid(password)) {
      return NextResponse.json({ error: 'Password is too short' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    const createdAt = new Date().toISOString()
    const user = await createUser({
      id: randomUUID(),
      username,
      passwordHash,
      createdAt,
    })

    if (!user) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          preferences: user.preferences ?? {},
        },
      },
      { status: 201 },
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
    return NextResponse.json({ error: 'Unable to create account' }, { status: 500 })
  }
}
