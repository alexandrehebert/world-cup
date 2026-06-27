/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './auth-context'
import {
  THEME_PREFERENCE_COOKIE_NAME,
  THEME_PREFERENCE_STORAGE_KEY,
  isThemePreference,
} from '../lib/user-preferences'

export type ThemePreference = 'light' | 'dark' | 'colorblind'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  setThemePreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

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

  const storedPreference = window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)

  if (isThemePreference(storedPreference)) {
    return storedPreference
  }

  return getSystemTheme()
}

export const ThemeProvider = ({
  children,
  initialThemePreference,
}: {
  children: ReactNode
  initialThemePreference?: ThemePreference
}) => {
  const { user, updateUserPreferences } = useAuth()
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => initialThemePreference ?? getStoredPreference())
  const isApplyingUserThemeRef = useRef(false)
  const resolvedTheme: ResolvedTheme = themePreference === 'light' ? 'light' : 'dark'

  useEffect(() => {
    const root = document.documentElement

    root.setAttribute('data-theme', themePreference)

    root.style.colorScheme = resolvedTheme
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, themePreference)
    document.cookie = `${THEME_PREFERENCE_COOKIE_NAME}=${encodeURIComponent(themePreference)}; Path=/; Max-Age=31536000; SameSite=Lax`
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
