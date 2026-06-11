/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const FAVORITE_TEAMS_STORAGE_KEY = 'football-world-cup.favorite-teams'

const readFavoriteTeamsFromStorage = () => {
  if (typeof window === 'undefined') {
    return [] as string[]
  }

  const rawValue = window.localStorage.getItem(FAVORITE_TEAMS_STORAGE_KEY)

  if (!rawValue) {
    return [] as string[]
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return [] as string[]
    }

    return parsedValue.filter((value): value is string => typeof value === 'string')
  } catch {
    return [] as string[]
  }
}

interface DashboardContextValue {
  selectedMatchId: string | null
  setSelectedMatchId: (matchId: string | null) => void
  favoriteTeamIds: string[]
  isFavoriteTeam: (teamId: string) => boolean
  toggleFavoriteTeam: (teamId: string) => void
  clearFavoriteTeams: () => void
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined)

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>(readFavoriteTeamsFromStorage)

  const isFavoriteTeam = useCallback((teamId: string) => favoriteTeamIds.includes(teamId), [favoriteTeamIds])

  const toggleFavoriteTeam = useCallback((teamId: string) => {
    setFavoriteTeamIds((current) => {
      if (current.includes(teamId)) {
        return current.filter((id) => id !== teamId)
      }

      return [...current, teamId]
    })
  }, [])

  const clearFavoriteTeams = useCallback(() => {
    setFavoriteTeamIds([])
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(FAVORITE_TEAMS_STORAGE_KEY, JSON.stringify(favoriteTeamIds))
  }, [favoriteTeamIds])

  const value = useMemo(
    () => ({
      selectedMatchId,
      setSelectedMatchId,
      favoriteTeamIds,
      isFavoriteTeam,
      toggleFavoriteTeam,
      clearFavoriteTeams,
    }),
    [selectedMatchId, favoriteTeamIds, isFavoriteTeam, toggleFavoriteTeam, clearFavoriteTeams],
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export const useDashboard = () => {
  const context = useContext(DashboardContext)

  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider')
  }

  return context
}
