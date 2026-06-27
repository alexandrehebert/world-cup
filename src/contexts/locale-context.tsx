/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { en } from '../translations/en'
import { fr } from '../translations/fr'
import { useAuth } from './auth-context'
import { LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY } from '../lib/user-preferences'
import type { TranslationSet } from '../translations/types'
import type { LocaleCode } from '../types/tournament'

const dictionaries = {
  en,
  fr,
} as const

interface LocaleContextValue {
  locale: LocaleCode
  t: TranslationSet
  setLocale: (locale: LocaleCode) => void
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)

const detectLocale = (): LocaleCode => {
  if (typeof navigator === 'undefined') {
    return 'en'
  }

  const storedLocale = typeof localStorage === 'undefined' ? null : localStorage.getItem(LOCALE_STORAGE_KEY)
  if (storedLocale === 'en' || storedLocale === 'fr') {
    return storedLocale
  }

  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export const LocaleProvider = ({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale?: LocaleCode
}) => {
  const { user, updateUserPreferences } = useAuth()
  const [locale, setLocaleState] = useState<LocaleCode>(() => initialLocale ?? detectLocale())
  const isApplyingUserLocaleRef = useRef(false)

  const setLocale = (nextLocale: LocaleCode) => setLocaleState(nextLocale)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.lang = locale
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`
  }, [locale])

  useEffect(() => {
    const preferredLocale = user?.preferences?.locale

    if (!preferredLocale) {
      return
    }

    setLocaleState((currentLocale) => {
      if (currentLocale === preferredLocale) {
        return currentLocale
      }

      isApplyingUserLocaleRef.current = true
      return preferredLocale
    })
  }, [user?.preferences?.locale])

  useEffect(() => {
    if (isApplyingUserLocaleRef.current) {
      isApplyingUserLocaleRef.current = false
      return
    }

    if (!user) {
      return
    }

    if (user.preferences?.locale === locale) {
      return
    }

    void updateUserPreferences({ locale }).catch(() => undefined)
  }, [locale, updateUserPreferences, user, user?.preferences?.locale])

  const value = useMemo(
    () => ({ locale, setLocale, t: dictionaries[locale] }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export const useLocale = () => {
  const context = useContext(LocaleContext)

  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }

  return context
}
