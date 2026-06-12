/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTournament } from './tournament-context'

const FAVORITE_TEAMS_STORAGE_KEY = 'football-world-cup.favorite-teams'
const MATCH_QUERY_PARAM = 'match'

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

const normalizeSlugPart = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')

  return normalized || 'tbd'
}

const getMatchIdFromSearch = (
  search: string,
  slugToMatchId: Record<string, string>,
  matchesById: Record<string, { id: string }>,
) => {
  const params = new URLSearchParams(search)
  const matchParam = params.get(MATCH_QUERY_PARAM)

  if (!matchParam) {
    return null
  }

  const matchIdFromSlug = slugToMatchId[matchParam]

  if (matchIdFromSlug) {
    return matchIdFromSlug
  }

  if (matchesById[matchParam]) {
    return matchParam
  }

  return null
}

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { matchesById, teamsById } = useTournament()
  const { matchIdToSlug, slugToMatchId } = useMemo(() => {
    const idToSlug: Record<string, string> = {}
    const slugToId: Record<string, string> = {}
    const duplicateCounts = new Map<string, number>()
    const matches = Object.values(matchesById).sort((first, second) => {
      if (first.kickoff !== second.kickoff) {
        return first.kickoff.localeCompare(second.kickoff)
      }

      return first.id.localeCompare(second.id)
    })

    for (const match of matches) {
      const homeCode = match.home.teamId ? teamsById[match.home.teamId]?.code : undefined
      const awayCode = match.away.teamId ? teamsById[match.away.teamId]?.code : undefined
      const baseSlug = `${normalizeSlugPart(homeCode ?? 'tbd')}-${normalizeSlugPart(awayCode ?? 'tbd')}`
      const count = (duplicateCounts.get(baseSlug) ?? 0) + 1
      duplicateCounts.set(baseSlug, count)
      const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`

      idToSlug[match.id] = slug
      slugToId[slug] = match.id
    }

    return {
      matchIdToSlug: idToSlug,
      slugToMatchId: slugToId,
    }
  }, [matchesById, teamsById])
  const [selectedMatchId, setSelectedMatchIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return getMatchIdFromSearch(window.location.search, slugToMatchId, matchesById)
  })
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>(readFavoriteTeamsFromStorage)

  const setSelectedMatchId = useCallback((matchId: string | null) => {
    setSelectedMatchIdState(matchId)
  }, [])

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

  useEffect(() => {
    const matchIdFromUrl = getMatchIdFromSearch(location.search, slugToMatchId, matchesById)

    setSelectedMatchIdState((current) => (current === matchIdFromUrl ? current : matchIdFromUrl))
  }, [location.search, matchesById, slugToMatchId])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const currentMatchParam = params.get(MATCH_QUERY_PARAM)
    const nextMatchParam = selectedMatchId ? (matchIdToSlug[selectedMatchId] ?? selectedMatchId) : null

    if (currentMatchParam === nextMatchParam) {
      return
    }

    if (nextMatchParam) {
      params.set(MATCH_QUERY_PARAM, nextMatchParam)
    } else {
      params.delete(MATCH_QUERY_PARAM)
    }

    const nextSearch = params.toString()

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: false },
    )
  }, [location.pathname, location.search, matchIdToSlug, navigate, selectedMatchId])

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
