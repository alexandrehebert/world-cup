import type { UserThemePreference } from '../types/predictions'
import type { LocaleCode } from '../types/tournament'

export const THEME_PREFERENCE_STORAGE_KEY = 'theme-preference'
export const THEME_PREFERENCE_COOKIE_NAME = 'theme-preference'
export const LOCALE_STORAGE_KEY = 'locale'
export const LOCALE_COOKIE_NAME = 'locale'
export const TIME_ZONE_COOKIE_NAME = 'time-zone'

export const isThemePreference = (value: unknown): value is UserThemePreference =>
  value === 'light' || value === 'dark' || value === 'colorblind'

export const isLocaleCode = (value: unknown): value is LocaleCode => value === 'en' || value === 'fr' || value === 'es'
export const isValidTimeZone = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export const resolveThemeColorScheme = (themePreference: UserThemePreference) =>
  themePreference === 'light' ? 'light' : 'dark'
