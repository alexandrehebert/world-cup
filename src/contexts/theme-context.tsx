/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './auth-context'

export type ThemePreference = 'light' | 'dark' | 'colorblind'
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

  if (storedPreference === 'light' || storedPreference === 'dark' || storedPreference === 'colorblind') {
    return storedPreference
  }

  return getSystemTheme()
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user, updateUserPreferences } = useAuth()
  const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredPreference)
  const isApplyingUserThemeRef = useRef(false)
  const resolvedTheme: ResolvedTheme = themePreference === 'light' ? 'light' : 'dark'

  useEffect(() => {
    const root = document.documentElement

    root.setAttribute('data-theme', themePreference)

    root.style.colorScheme = resolvedTheme
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference)
  }, [resolvedTheme, themePreference])

  useEffect(() => {
    const userTheme = user?.preferences?.themePreference

    if (!userTheme) {
      return
    }

    setThemePreference((currentThemePreference) => {
      if (currentThemePreference === userTheme) {
        return currentThemePreference
      }

      isApplyingUserThemeRef.current = true
      return userTheme
    })
  }, [user?.preferences?.themePreference])

  useEffect(() => {
    if (isApplyingUserThemeRef.current) {
      isApplyingUserThemeRef.current = false
      return
    }

    if (!user) {
      return
    }

    if (user.preferences?.themePreference === themePreference) {
      return
    }

    void updateUserPreferences({ themePreference }).catch(() => undefined)
  }, [themePreference, updateUserPreferences, user, user?.preferences?.themePreference])

  const toggleTheme = useCallback(() => {
    setThemePreference((currentPreference) => {
      if (currentPreference === 'light') {
        return 'dark'
      }

      if (currentPreference === 'dark') {
        return 'colorblind'
      }

      return 'light'
    })
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
