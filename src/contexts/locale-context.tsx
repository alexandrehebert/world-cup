/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { en } from '../translations/en'
import { fr } from '../translations/fr'
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
  const [locale, setLocaleState] = useState<LocaleCode>(detectLocale)

  const setLocale = (nextLocale: LocaleCode) => {
    setLocaleState(nextLocale)

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', nextLocale)
    }
  }

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
