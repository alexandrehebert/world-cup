import { NextRequest, NextResponse } from 'next/server'
import { parseSessionToken, sessionCookieName } from '../../../../server/auth'
import { getUserById, updateUserPreferences } from '../../../../server/kv-store'
import {
  LOCALE_COOKIE_NAME,
  THEME_PREFERENCE_COOKIE_NAME,
  isLocaleCode,
  isThemePreference,
} from '../../../../lib/user-preferences'
import type { UserPreferences } from '../../../../types/predictions'

type PreferencesBody = Partial<UserPreferences>

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value
  const session = parseSessionToken(token)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as PreferencesBody
    const nextPreferences: Partial<UserPreferences> = {}

    if (Array.isArray(body.favoriteTeamIds)) {
      nextPreferences.favoriteTeamIds = body.favoriteTeamIds.filter((teamId): teamId is string => typeof teamId === 'string')
    }

    if (body.themePreference === 'light' || body.themePreference === 'dark' || body.themePreference === 'colorblind') {
      nextPreferences.themePreference = body.themePreference
    }

    if (body.locale === 'en' || body.locale === 'fr') {
      nextPreferences.locale = body.locale
    }

    await updateUserPreferences(session.id, nextPreferences)
    const refreshedUser = await getUserById(session.id)

    if (!refreshedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const response = NextResponse.json(
      {
        preferences: refreshedUser.preferences ?? {},
      },
      { status: 200 },
    )
    const localePreference = refreshedUser.preferences?.locale
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
    const themePreference = refreshedUser.preferences?.themePreference
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
    return NextResponse.json({ error: 'Unable to save preferences' }, { status: 500 })
  }
}
