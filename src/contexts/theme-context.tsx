/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  setThemePreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = 'theme-preference'
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const getStoredPreference = (): ThemePreference => {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (storedPreference === 'light' || storedPreference === 'dark') {
    return storedPreference
  }

  return getSystemTheme()
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredPreference)
  const resolvedTheme: ResolvedTheme = themePreference

  useEffect(() => {
    const root = document.documentElement

    root.setAttribute('data-theme', themePreference)

    root.style.colorScheme = resolvedTheme
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference)
  }, [resolvedTheme, themePreference])

  const toggleTheme = useCallback(() => {
    setThemePreference((currentPreference) => (currentPreference === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo(
    () => ({ themePreference, resolvedTheme, setThemePreference, toggleTheme }),
    [resolvedTheme, themePreference, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
