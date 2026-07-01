/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './auth-context'
import { useTournament } from './tournament-context'
import { isPredictionsFeatureEnabled } from '../lib/features'

const FAVORITE_TEAMS_STORAGE_KEY = 'football-world-cup.favorite-teams'
const MATCH_QUERY_PARAM = 'match'
const MATCH_PATH_REGEX = /^\/(match|bracket)\/([^/]+)\/vs\/([^/]+)\/?$/i
const TBD_MATCH_PATH_REGEX = /^\/(match|bracket)\/tbd\/([^/]+)\/(\d+)\/?$/i
const TEAM_PATH_REGEX = /^\/team\/([^/]+)\/?$/i
type MatchPathSection = 'match' | 'bracket'

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
const getSearchWithoutLegacyMatchParam = (search: string) => {
  const params = new URLSearchParams(search)
  params.delete(MATCH_QUERY_PARAM)
  const nextSearch = params.toString()

  return nextSearch ? `?${nextSearch}` : ''
}

const getMatchPathDetails = (pathname: string): { section: MatchPathSection; pathKey: string } | null => {
  const tbdMatch = pathname.match(TBD_MATCH_PATH_REGEX)
  if (tbdMatch) {
    return {
      section: tbdMatch[1].toLowerCase() === 'bracket' ? 'bracket' : 'match',
      pathKey: `tbd/${decodeURIComponent(tbdMatch[2])}/${tbdMatch[3]}`,
    }
  }

  const match = pathname.match(MATCH_PATH_REGEX)
  if (!match) {
    return null
  }

  const section = match[1].toLowerCase() === 'bracket' ? 'bracket' : 'match'
  const pathKey = `${normalizeMatchCode(decodeURIComponent(match[2]))}/vs/${normalizeMatchCode(decodeURIComponent(match[3]))}`

  return { section, pathKey }
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

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation()
  const navigate = useNavigate()
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
      const hasResolvedTeams = Boolean(homeCode && awayCode)
      const baseSlug = hasResolvedTeams
        ? `${normalizeSlugPart(homeCode)}-${normalizeSlugPart(awayCode)}`
        : bracketPosition
          ? `tbd-${bracketPosition.roundId}-${bracketPosition.slotIndex + 1}`
          : `match-${match.id}`
      const count = (duplicateCounts.get(baseSlug) ?? 0) + 1
      duplicateCounts.set(baseSlug, count)
      const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`
      const homePathCode = homeCode ? normalizeMatchCode(homeCode) : null
      const awayPathCode = awayCode ? normalizeMatchCode(awayCode) : null
      const pathKey = homePathCode && awayPathCode
        ? `${homePathCode}/vs/${awayPathCode}`
        : bracketPosition
          ? `tbd/${bracketPosition.roundId}/${bracketPosition.slotIndex + 1}`
          : null
      const matchPath = pathKey ?? `?${new URLSearchParams({ match: match.id }).toString()}`

      idToSlug[match.id] = slug
      slugToId[slug] = match.id
      idToPath[match.id] = matchPath
      if (pathKey && !pathToId[pathKey]) {
        pathToId[pathKey] = match.id
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
    const teamCodeFromUrl = getTeamPathCode(location.pathname)

    if (!teamCodeFromUrl) {
      return null
    }

    return codeToTeamId[teamCodeFromUrl] ?? null
  })
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>(() => {
    if (Array.isArray(user?.preferences?.favoriteTeamIds)) {
      return user.preferences.favoriteTeamIds
    }

    return []
  })
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
      const isBracketContext = location.pathname === '/bracket' || location.pathname.startsWith('/bracket/')

      if (!matchPath) {
        return isBracketContext ? '/bracket' : '/match'
      }

      return matchPath.startsWith('?')
        ? `${isBracketContext ? '/bracket' : '/match'}${matchPath}`
        : `${isBracketContext ? '/bracket' : '/match'}/${matchPath}`
    },
    [location.pathname, matchIdToPath],
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
    const matchIdFromUrl = getMatchIdFromSearch(location.pathname, location.search, pathToMatchId, slugToMatchId, matchesById)

    setSelectedMatchIdState((current) => (current === matchIdFromUrl ? current : matchIdFromUrl))
  }, [location.pathname, location.search, matchesById, pathToMatchId, slugToMatchId])

  useEffect(() => {
    const teamCodeFromUrl = getTeamPathCode(location.pathname)
    const teamIdFromUrl = teamCodeFromUrl ? (codeToTeamId[teamCodeFromUrl] ?? null) : null

    setSelectedTeamIdState((current) => (current === teamIdFromUrl ? current : teamIdFromUrl))
  }, [codeToTeamId, location.pathname])

  useEffect(() => {
    const currentMatchDetails = getMatchPathDetails(location.pathname)
    const currentMatchId = getMatchIdFromSearch(location.pathname, location.search, pathToMatchId, slugToMatchId, matchesById)
    const currentMatchPath = currentMatchId ? (matchIdToPath[currentMatchId] ?? null) : null
    const currentMatchSection: MatchPathSection | null = currentMatchDetails?.section ?? (
      location.pathname === '/bracket'
        ? 'bracket'
        : location.pathname === '/matches' || location.pathname === '/match'
          ? 'match'
          : null
    )
    const nextMatchPath = selectedMatchId ? (matchIdToPath[selectedMatchId] ?? null) : null
    const shouldSyncMatchUrl = currentMatchSection !== null || currentMatchPath !== null

    if (!shouldSyncMatchUrl) {
      return
    }

    if (currentMatchPath === nextMatchPath) {
      return
    }

    if (nextMatchPath) {
      const nextPathname = `/${currentMatchSection === 'bracket' ? 'bracket' : 'match'}`
      const nextSearchParams = new URLSearchParams(getSearchWithoutLegacyMatchParam(location.search))

      if (nextMatchPath.startsWith('?')) {
        const nextMatchId = new URLSearchParams(nextMatchPath).get(MATCH_QUERY_PARAM)
        if (nextMatchId) {
          nextSearchParams.set(MATCH_QUERY_PARAM, nextMatchId)
        }
      }

      navigate(
        {
          pathname: nextMatchPath.startsWith('?') ? nextPathname : `${nextPathname}/${nextMatchPath}`,
          search: nextSearchParams.toString() ? `?${nextSearchParams.toString()}` : '',
        },
        { replace: false },
      )
      return
    }

    if (currentMatchPath) {
      navigate(
        {
          pathname: currentMatchSection === 'bracket' ? '/bracket' : '/matches',
          search: getSearchWithoutLegacyMatchParam(location.search),
        },
        { replace: false },
      )
    }
  }, [location.pathname, location.search, matchIdToPath, matchesById, navigate, pathToMatchId, selectedMatchId, slugToMatchId])

  useEffect(() => {
    if (selectedMatchId !== null) {
      return
    }

    const currentTeamCode = getTeamPathCode(location.pathname)
    const nextTeamCode = selectedTeamId ? (teamIdToCode[selectedTeamId] ?? null) : null
    const isTeamsRoute = location.pathname === '/teams' || location.pathname === '/team'
    const shouldSyncTeamUrl = isTeamsRoute || currentTeamCode !== null

    if (!shouldSyncTeamUrl) {
      return
    }

    if (currentTeamCode === nextTeamCode) {
      return
    }

    if (nextTeamCode) {
      navigate(
        {
          pathname: `/team/${nextTeamCode}`,
          search: location.search,
        },
        { replace: false },
      )
      return
    }

    if (currentTeamCode) {
      navigate(
        {
          pathname: '/teams',
          search: location.search,
        },
        { replace: false },
      )
    }
  }, [location.pathname, location.search, navigate, selectedMatchId, selectedTeamId, teamIdToCode])

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
