/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { en } from '../translations/en'
import { fr } from '../translations/fr'
import { useAuth } from './auth-context'
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

  const storedLocale = typeof localStorage === 'undefined' ? null : localStorage.getItem('locale')
  if (storedLocale === 'en' || storedLocale === 'fr') {
    return storedLocale
  }

  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const { user, updateUserPreferences } = useAuth()
  const [locale, setLocaleState] = useState<LocaleCode>(detectLocale)
  const isApplyingUserLocaleRef = useRef(false)

  const setLocale = (nextLocale: LocaleCode) => {
    setLocaleState(nextLocale)

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', nextLocale)
    }
  }

  useEffect(() => {
    const preferredLocale = user?.preferences?.locale

    if (!preferredLocale || locale === preferredLocale) {
      return
    }

    isApplyingUserLocaleRef.current = true
    setLocaleState(preferredLocale)
    localStorage.setItem('locale', preferredLocale)
  }, [locale, user?.preferences?.locale])

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
