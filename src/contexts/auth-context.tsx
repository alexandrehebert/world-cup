/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isAccountFeatureEnabled } from '../lib/features'
import type { AuthUser, UserPreferences } from '../types/predictions'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthModalOpen: boolean
  authModalMode: 'login' | 'register'
  openAuthModal: (mode?: 'login' | 'register') => void
  closeAuthModal: () => void
  setAuthModalMode: (mode: 'login' | 'register') => void
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>
  register: (username: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string }
    return payload.error ?? 'Request failed'
  } catch {
    return 'Request failed'
  }
}

export const AuthProvider = ({
  children,
  initialUser,
  sessionResolved = false,
}: {
  children: ReactNode
  initialUser?: AuthUser | null
  sessionResolved?: boolean
}) => {
  const [user, setUser] = useState<AuthUser | null>(isAccountFeatureEnabled ? (initialUser ?? null) : null)
  const [isLoading, setIsLoading] = useState(isAccountFeatureEnabled ? !sessionResolved : false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login')

  const refreshSession = useCallback(async () => {
    if (!isAccountFeatureEnabled) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = (await response.json()) as { user?: AuthUser | null }
      setUser(payload.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionResolved) {
      return
    }

    void refreshSession()
  }, [refreshSession, sessionResolved])

  const register = useCallback(async (username: string, password: string) => {
    if (!isAccountFeatureEnabled) {
      return { ok: false as const, error: 'Account feature is disabled' }
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      return { ok: false as const, error: await readErrorMessage(response) }
    }

    const payload = (await response.json()) as { user?: AuthUser }
    setUser(payload.user ?? null)
    setIsAuthModalOpen(false)

    return { ok: true as const }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    if (!isAccountFeatureEnabled) {
      return { ok: false as const, error: 'Account feature is disabled' }
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      return { ok: false as const, error: await readErrorMessage(response) }
    }

    const payload = (await response.json()) as { user?: AuthUser }
    setUser(payload.user ?? null)
    setIsAuthModalOpen(false)

    return { ok: true as const }
  }, [])

  const logout = useCallback(async () => {
    if (!isAccountFeatureEnabled) {
      setUser(null)
      return
    }

    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    setUser(null)
  }, [])

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    if (!isAccountFeatureEnabled) {
      return
    }

    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false)
  }, [])

  const updateUserPreferences = useCallback(
    async (preferences: Partial<UserPreferences>) => {
      if (!isAccountFeatureEnabled) {
        return
      }

      if (!user) {
        return
      }

      const response = await fetch('/api/auth/preferences', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      const payload = (await response.json()) as { preferences?: Partial<UserPreferences> }
      setUser((currentUser) => {
        if (!currentUser) {
          return currentUser
        }

        return {
          ...currentUser,
          preferences: payload.preferences ?? currentUser.preferences ?? {},
        }
      })
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      setAuthModalMode,
      updateUserPreferences,
      register,
      login,
      logout,
    }),
    [user, isLoading, isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal, updateUserPreferences, register, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
