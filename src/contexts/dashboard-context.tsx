/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'
import { useTournament } from './tournament-context'
import { isPredictionsFeatureEnabled } from '../lib/features'
import {
  buildLegacyMatchPathKey,
  buildMatchPathKey,
  buildTbdMatchPathKey,
  parseMatchPathname,
  type BracketRoundId,
  type MatchPathSection,
} from '../lib/match-path'

const FAVORITE_TEAMS_STORAGE_KEY = 'football-world-cup.favorite-teams'
const MATCH_QUERY_PARAM = 'match'
const TBD_MATCH_PATH_REGEX = /^\/(match|bracket|predict)\/tbd\/([^/]+)\/(\d+)\/?$/i
const TEAM_PATH_REGEX = /^\/team\/([^/]+)\/?$/i

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
  getTeamSharePath: (teamId: string) => string
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
const normalizeTeamCode = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '')

const getMatchPathDetails = (pathname: string): { section: MatchPathSection; pathKey: string } | null => {
  const tbdMatch = pathname.match(TBD_MATCH_PATH_REGEX)
  if (tbdMatch) {
    return {
      section: tbdMatch[1].toLowerCase() as MatchPathSection,
      pathKey: `tbd/${decodeURIComponent(tbdMatch[2])}/${tbdMatch[3]}`,
    }
  }

  const parsedPath = parseMatchPathname(pathname)
  if (!parsedPath) {
    return null
  }

  return {
    section: parsedPath.section,
    pathKey: parsedPath.pathKey,
  }
}

const getMatchPathKey = (pathname: string) => {
  const details = getMatchPathDetails(pathname)
  return details?.pathKey ?? null
}

const getTeamPathCode = (pathname: string) => {
  const match = pathname.match(TEAM_PATH_REGEX)

  if (!match) {
    return null
  }

  return normalizeTeamCode(decodeURIComponent(match[1]))
}

const getMatchIdFromSearch = (
  pathname: string,
  search: string,
  pathToMatchId: Record<string, string>,
  slugToMatchId: Record<string, string>,
  matchesById: Record<string, { id: string }>,
) => {
  const params = new URLSearchParams(search)
  const matchParam = params.get(MATCH_QUERY_PARAM)

  if (matchParam) {
    const matchIdFromSlug = slugToMatchId[matchParam]

    if (matchIdFromSlug) {
      return matchIdFromSlug
    }

    if (matchesById[matchParam]) {
      return matchParam
    }
  }

  const pathKey = getMatchPathKey(pathname)

  if (pathKey && pathToMatchId[pathKey]) {
    return pathToMatchId[pathKey]
  }

  return null
}

const getTeamIdFromPath = (
  pathname: string,
  codeToTeamId: Record<string, string>,
) => {
  const teamCodeFromPath = getTeamPathCode(pathname)
  if (!teamCodeFromPath) {
    return null
  }

  return codeToTeamId[teamCodeFromPath] ?? null
}
export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation()
  const { user, updateUserPreferences } = useAuth()
  const { matchesById, teamsById, bracketRounds } = useTournament()
  const { matchIdToPath, pathToMatchId, slugToMatchId } = useMemo(() => {
    const idToSlug: Record<string, string> = {}
    const slugToId: Record<string, string> = {}
    const idToPath: Record<string, string> = {}
    const pathToId: Record<string, string> = {}
    const duplicateCounts = new Map<string, number>()
    const bracketPositionByMatchId = new Map<string, { roundId: string; slotIndex: number }>()

    for (const round of bracketRounds) {
      round.matchIds.forEach((matchId, slotIndex) => {
        bracketPositionByMatchId.set(matchId, { roundId: round.id, slotIndex })
      })
    }

    const matches = Object.values(matchesById).sort((first, second) => {
      if (first.kickoff !== second.kickoff) {
        return first.kickoff.localeCompare(second.kickoff)
      }

      return first.id.localeCompare(second.id)
    })

    for (const match of matches) {
      const homeCode = match.home.teamId ? teamsById[match.home.teamId]?.code : undefined
      const awayCode = match.away.teamId ? teamsById[match.away.teamId]?.code : undefined
      const bracketPosition = bracketPositionByMatchId.get(match.id)
      let baseSlug: string

      if (homeCode && awayCode) {
        baseSlug = `${normalizeSlugPart(homeCode)}-${normalizeSlugPart(awayCode)}`
      } else if (bracketPosition) {
        baseSlug = `tbd-${bracketPosition.roundId}-${bracketPosition.slotIndex + 1}`
      } else {
        baseSlug = `match-${match.id}`
      }
      const count = (duplicateCounts.get(baseSlug) ?? 0) + 1
      duplicateCounts.set(baseSlug, count)
      const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`
      const homePathCode = homeCode ? normalizeMatchCode(homeCode) : null
      const awayPathCode = awayCode ? normalizeMatchCode(awayCode) : null
      const pathKey = homePathCode && awayPathCode
        ? buildMatchPathKey(match.stage, homePathCode, awayPathCode)
        : bracketPosition
          ? buildTbdMatchPathKey(bracketPosition.roundId as BracketRoundId, bracketPosition.slotIndex)
          : null
      const legacyPathKey = homePathCode && awayPathCode ? buildLegacyMatchPathKey(homePathCode, awayPathCode) : null
      const matchPath = pathKey ?? `?${new URLSearchParams({ match: match.id }).toString()}`

      idToSlug[match.id] = slug
      slugToId[slug] = match.id
      idToPath[match.id] = matchPath
      if (pathKey && !pathToId[pathKey]) {
        pathToId[pathKey] = match.id
      }
      if (legacyPathKey && !pathToId[legacyPathKey]) {
        pathToId[legacyPathKey] = match.id
      }
    }

    return {
      slugToMatchId: slugToId,
      matchIdToPath: idToPath,
      pathToMatchId: pathToId,
    }
  }, [bracketRounds, matchesById, teamsById])
  const { teamIdToCode, codeToTeamId } = useMemo(() => {
    const idToCode: Record<string, string> = {}
    const codeToId: Record<string, string> = {}

    for (const team of Object.values(teamsById)) {
      const normalizedCode = normalizeTeamCode(team.code)

      if (!normalizedCode) {
        continue
      }

      idToCode[team.id] = normalizedCode

      if (!codeToId[normalizedCode]) {
        codeToId[normalizedCode] = team.id
      }
    }

    return {
      teamIdToCode: idToCode,
      codeToTeamId: codeToId,
    }
  }, [teamsById])
  const [selectedMatchId, setSelectedMatchIdState] = useState<string | null>(() => {
    return getMatchIdFromSearch(location.pathname, location.search, pathToMatchId, slugToMatchId, matchesById)
  })
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(() => {
    return getTeamIdFromPath(location.pathname, codeToTeamId)
  })
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>(() => {
    if (Array.isArray(user?.preferences?.favoriteTeamIds)) {
      return user.preferences.favoriteTeamIds
    }

    return []
  })
  const isApplyingUserFavoritesRef = useRef(false)
  const suppressMatchUrlHydrationRef = useRef(false)

  const setSelectedMatchId = useCallback((matchId: string | null) => {
    setSelectedMatchIdState(matchId)
    if (matchId === null) {
      suppressMatchUrlHydrationRef.current = true
    }
    if (matchId !== null) {
      setSelectedTeamIdState(null)
    }
  }, [])

  const setSelectedTeamId = useCallback((teamId: string | null) => {
    setSelectedTeamIdState(teamId)
    if (teamId !== null) {
      suppressMatchUrlHydrationRef.current = true
      setSelectedMatchIdState(null)
    }
  }, [])

  const getMatchSharePath = useCallback(
    (matchId: string) => {
      const matchPath = matchIdToPath[matchId]
      if (!matchPath) {
        return '/match'
      }

      return matchPath.startsWith('?') ? `/match${matchPath}` : `/match/${matchPath}`
    },
    [matchIdToPath],
  )

  const getMatchPredictionPath = useCallback(
    (matchId: string) => {
      if (!isPredictionsFeatureEnabled) {
        return getMatchSharePath(matchId)
      }
      const matchPath = matchIdToPath[matchId]

      if (!matchPath) {
        return '/predictions'
      }

      return matchPath.startsWith('?') ? `/predict${matchPath}` : `/predict/${matchPath}`
    },
    [getMatchSharePath, matchIdToPath],
  )

  const getTeamSharePath = useCallback(
    (teamId: string) => {
      const teamCode = teamIdToCode[teamId]
      return teamCode ? `/team/${teamCode}` : '/teams'
    },
    [teamIdToCode],
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
    if (user) {
      return
    }

    const storedFavoriteTeamIds = readFavoriteTeamsFromStorage()

    setFavoriteTeamIds((current) => (
      areFavoriteListsEqual(current, storedFavoriteTeamIds) ? current : storedFavoriteTeamIds
    ))
  }, [user])

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
    const currentPathname = typeof window !== 'undefined' ? window.location.pathname : location.pathname
    const currentSearch = typeof window !== 'undefined' ? window.location.search : location.search
    const matchIdFromUrl = getMatchIdFromSearch(currentPathname, currentSearch, pathToMatchId, slugToMatchId, matchesById)

    if (suppressMatchUrlHydrationRef.current) {
      if (matchIdFromUrl !== null) {
        return
      }
      suppressMatchUrlHydrationRef.current = false
    }

    setSelectedMatchIdState((current) => (current === matchIdFromUrl ? current : matchIdFromUrl))
  }, [location.pathname, location.search, matchesById, pathToMatchId, slugToMatchId])

  useEffect(() => {
    const currentPathname = typeof window !== 'undefined' ? window.location.pathname : location.pathname
    const teamIdFromUrl = getTeamIdFromPath(currentPathname, codeToTeamId)
    const isTeamsRoute = currentPathname === '/teams' || currentPathname === '/team' || currentPathname.startsWith('/team/')

    setSelectedTeamIdState((current) => {
      if (teamIdFromUrl !== null) {
        return current === teamIdFromUrl ? current : teamIdFromUrl
      }

      // Keep explicit team selections opened from non-team routes (for example from a match modal).
      if (!isTeamsRoute) {
        return current
      }

      return current === null ? current : null
    })
  }, [codeToTeamId, location.pathname])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const currentPathname = window.location.pathname
    const currentSearch = window.location.search
    const selectedTeamCode = selectedTeamId ? (teamIdToCode[selectedTeamId] ?? null) : null
    const selectedMatchPath = selectedMatchId ? matchIdToPath[selectedMatchId] : null
    const matchContextBasePath =
      currentPathname === '/bracket' || currentPathname.startsWith('/bracket/')
        ? '/bracket'
        : currentPathname === '/predict' || currentPathname.startsWith('/predict/')
          ? '/predict'
          : '/match'
    const basePathname =
      currentPathname === '/match' || currentPathname.startsWith('/match/')
        ? '/matches'
        : currentPathname === '/team' || currentPathname.startsWith('/team/')
          ? '/teams'
          : currentPathname === '/bracket' || currentPathname.startsWith('/bracket/')
            ? '/bracket'
            : currentPathname === '/predict' || currentPathname.startsWith('/predict/')
              ? '/predict'
              : currentPathname
    const targetUrl = selectedTeamCode
      ? `/team/${selectedTeamCode}`
      : selectedMatchPath
        ? selectedMatchPath.startsWith('?')
          ? `${matchContextBasePath}${selectedMatchPath}`
          : `${matchContextBasePath}/${selectedMatchPath}`
        : `${basePathname}${currentSearch}`
    const currentUrl = `${currentPathname}${currentSearch}`

    if (targetUrl === currentUrl) {
      return
    }

    window.history.replaceState(window.history.state, '', targetUrl)

    // Keep React Router's location in sync with history.replaceState changes for non-team modal URLs.
    if (!selectedTeamCode) {
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
    }
  }, [location.pathname, location.search, matchIdToPath, selectedMatchId, selectedTeamId, teamIdToCode])

  const value = useMemo(
    () => ({
      selectedMatchId,
      setSelectedMatchId,
      getMatchSharePath,
      getMatchPredictionPath,
      getTeamSharePath,
      selectedTeamId,
      setSelectedTeamId,
      favoriteTeamIds,
      isFavoriteTeam,
      toggleFavoriteTeam,
      clearFavoriteTeams,
    }),
    [selectedMatchId, setSelectedMatchId, getMatchSharePath, getMatchPredictionPath, getTeamSharePath, selectedTeamId, setSelectedTeamId, favoriteTeamIds, isFavoriteTeam, toggleFavoriteTeam, clearFavoriteTeams],
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
