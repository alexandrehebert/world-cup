import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import type { LocaleCode } from '../types/tournament'

const SUPPORTED_LOCALES: LocaleCode[] = ['en', 'fr', 'es', 'de']
const DEFAULT_LOCALE: LocaleCode = 'en'

const intlByLocale: Record<LocaleCode, { dateLocale: string; numberLocale: string }> = {
  de: de.intl,
  en: en.intl,
  es: es.intl,
  fr: fr.intl,
}

export const getIntlDateLocale = (locale: LocaleCode) => intlByLocale[locale].dateLocale
export const getIntlNumberLocale = (locale: LocaleCode) => intlByLocale[locale].numberLocale

export const getSupportedLocaleOrNull = (value: string | null | undefined): LocaleCode | null => {
  if (!value) {
    return null
  }

  return SUPPORTED_LOCALES.includes(value as LocaleCode) ? (value as LocaleCode) : null
}

export const resolveLocaleFromLanguage = (language: string | null | undefined): LocaleCode => {
  const normalized = String(language ?? '').toLowerCase()
  const matchedLocale = SUPPORTED_LOCALES.find((locale) => locale !== DEFAULT_LOCALE && normalized.startsWith(locale))
  return matchedLocale ?? DEFAULT_LOCALE
}
