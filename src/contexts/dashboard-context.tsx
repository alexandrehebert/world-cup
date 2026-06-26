/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './auth-context'
import { useTournament } from './tournament-context'

const FAVORITE_TEAMS_STORAGE_KEY = 'football-world-cup.favorite-teams'
const MATCH_QUERY_PARAM = 'match'
const MATCH_PATH_REGEX = /^\/match\/([^/]+)\/vs\/([^/]+)\/?$/i

const areFavoriteListsEqual = (first: string[], second: string[]) => {
  if (first.length !== second.length) {
    return false
  }

  return first.every((teamId, index) => second[index] === teamId)
}

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
  getMatchSharePath: (matchId: string) => string
  getMatchPredictionPath: (matchId: string) => string
  selectedTeamId: string | null
  setSelectedTeamId: (teamId: string | null) => void
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

const normalizeMatchCode = (value: string) => value.trim().toUpperCase()

const getMatchPathKey = (pathname: string) => {
  const match = pathname.match(MATCH_PATH_REGEX)

  if (!match) {
    return null
  }

  return `${normalizeMatchCode(decodeURIComponent(match[1]))}/vs/${normalizeMatchCode(decodeURIComponent(match[2]))}`
}

const getMatchIdFromSearch = (
  pathname: string,
  search: string,
  pathToMatchId: Record<string, string>,
  slugToMatchId: Record<string, string>,
  matchesById: Record<string, { id: string }>,
) => {
  const pathKey = getMatchPathKey(pathname)

  if (pathKey && pathToMatchId[pathKey]) {
    return pathToMatchId[pathKey]
  }

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
  const { user, updateUserPreferences } = useAuth()
  const { matchesById, teamsById } = useTournament()
  const { matchIdToPath, pathToMatchId, slugToMatchId } = useMemo(() => {
    const idToSlug: Record<string, string> = {}
    const slugToId: Record<string, string> = {}
    const idToPath: Record<string, string> = {}
    const pathToId: Record<string, string> = {}
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
      const homePathCode = homeCode ? normalizeMatchCode(homeCode) : 'TBD'
      const awayPathCode = awayCode ? normalizeMatchCode(awayCode) : 'TBD'
      const pathKey = `${homePathCode}/vs/${awayPathCode}`

      idToSlug[match.id] = slug
      slugToId[slug] = match.id
      idToPath[match.id] = pathKey
      if (!pathToId[pathKey]) {
        pathToId[pathKey] = match.id
      }
    }

    return {
      slugToMatchId: slugToId,
      matchIdToPath: idToPath,
      pathToMatchId: pathToId,
    }
  }, [matchesById, teamsById])
  const [selectedMatchId, setSelectedMatchIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return getMatchIdFromSearch(window.location.pathname, window.location.search, pathToMatchId, slugToMatchId, matchesById)
  })
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(null)
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>(readFavoriteTeamsFromStorage)
  const isApplyingUserFavoritesRef = useRef(false)

  const setSelectedMatchId = useCallback((matchId: string | null) => {
    setSelectedMatchIdState(matchId)
    if (matchId !== null) {
      setSelectedTeamIdState(null)
    }
  }, [])

  const setSelectedTeamId = useCallback((teamId: string | null) => {
    setSelectedTeamIdState(teamId)
    if (teamId !== null) {
      setSelectedMatchIdState(null)
    }
  }, [])

  const getMatchSharePath = useCallback(
    (matchId: string) => {
      const matchPath = matchIdToPath[matchId]

      return matchPath ? `/match/${matchPath}` : `/match`
    },
    [matchIdToPath],
  )

  const getMatchPredictionPath = useCallback(
    (matchId: string) => {
      const matchPath = matchIdToPath[matchId]

      return matchPath ? `/predict/${matchPath}` : '/predictions'
    },
    [matchIdToPath],
  )

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
    if (!user || !Array.isArray(user.preferences?.favoriteTeamIds)) {
      return
    }

    if (areFavoriteListsEqual(favoriteTeamIds, user.preferences.favoriteTeamIds)) {
      return
    }

    isApplyingUserFavoritesRef.current = true
    setFavoriteTeamIds(user.preferences.favoriteTeamIds)
  }, [favoriteTeamIds, user, user?.preferences?.favoriteTeamIds])

  useEffect(() => {
    if (isApplyingUserFavoritesRef.current) {
      isApplyingUserFavoritesRef.current = false
      return
    }

    if (!user) {
      return
    }

    const userFavorites = Array.isArray(user.preferences?.favoriteTeamIds) ? user.preferences.favoriteTeamIds : []

    if (areFavoriteListsEqual(favoriteTeamIds, userFavorites)) {
      return
    }

    void updateUserPreferences({ favoriteTeamIds }).catch(() => undefined)
  }, [favoriteTeamIds, updateUserPreferences, user, user?.preferences?.favoriteTeamIds])

  useEffect(() => {
    const matchIdFromUrl = getMatchIdFromSearch(location.pathname, location.search, pathToMatchId, slugToMatchId, matchesById)

    setSelectedMatchIdState((current) => (current === matchIdFromUrl ? current : matchIdFromUrl))
  }, [location.pathname, location.search, matchesById, pathToMatchId, slugToMatchId])

  useEffect(() => {
    const currentMatchPath = getMatchPathKey(location.pathname)
    const nextMatchPath = selectedMatchId ? (matchIdToPath[selectedMatchId] ?? null) : null
    const isMatchesRoute = location.pathname === '/matches' || location.pathname === '/match'
    const shouldSyncMatchUrl = isMatchesRoute || currentMatchPath !== null

    if (!shouldSyncMatchUrl) {
      return
    }

    if (currentMatchPath === nextMatchPath) {
      return
    }

    if (nextMatchPath) {
      navigate(
        {
          pathname: `/match/${nextMatchPath}`,
          search: '',
        },
        { replace: false },
      )
      return
    }

    if (currentMatchPath) {
      navigate(
        {
          pathname: '/matches',
          search: '',
        },
        { replace: false },
      )
    }
  }, [location.pathname, matchIdToPath, navigate, selectedMatchId])

  const value = useMemo(
    () => ({
      selectedMatchId,
      setSelectedMatchId,
      getMatchSharePath,
      getMatchPredictionPath,
      selectedTeamId,
      setSelectedTeamId,
      favoriteTeamIds,
      isFavoriteTeam,
      toggleFavoriteTeam,
      clearFavoriteTeams,
    }),
    [selectedMatchId, setSelectedMatchId, getMatchSharePath, getMatchPredictionPath, selectedTeamId, setSelectedTeamId, favoriteTeamIds, isFavoriteTeam, toggleFavoriteTeam, clearFavoriteTeams],
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
