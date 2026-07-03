/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { parseCompetitionId } from '../competitions'
import { buildTournamentModel, type TournamentModel } from '../lib/tournament'
import { getTournamentApiRequestUrl } from '../lib/tournament-api'
import { parseCompetitionIdFromFragment } from '../lib/competition-navigation'
import type { TournamentData } from '../types/tournament'

const localTournamentData: TournamentData = {
  meta: {
    edition: '',
    season: '',
    host: '',
    updatedAt: new Date(0).toISOString(),
    venueCountry: '',
  },
  teams: [],
  groups: [],
  matches: [],
  bracketRounds: [],
}
const localTournamentModel = buildTournamentModel(localTournamentData)

const getUpdatedAtMs = (value: string | undefined) => {
  const timestamp = Date.parse(value ?? '')

  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

const TournamentContext = createContext<TournamentModel | undefined>(undefined)

export const TournamentProvider = ({ children, initialData }: { children: ReactNode; initialData?: TournamentData }) => {
  const initialCompetitionId = parseCompetitionId(initialData?.meta.competitionId)
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    return parseCompetitionIdFromFragment(window.location.hash, initialCompetitionId)
  })
  const [value, setValue] = useState<TournamentModel>(() => {
    if (initialData) {
      return buildTournamentModel(initialData)
    }

    return localTournamentModel
  })

  const loadRemoteTournament = useCallback(async (isCancelledRef?: { current: boolean }) => {
    try {
      const response = await fetch(getTournamentApiRequestUrl(selectedCompetitionId), {
        cache: 'no-store',
        headers: {
          'cache-control': 'no-cache',
          pragma: 'no-cache',
        },
      })

      if (!response.ok) {
        return
      }

      const payload = (await response.json()) as TournamentData

      if (!isCancelledRef?.current) {
        setValue((previousValue) => {
          const hasCompetitionChanged = payload.meta.competitionId !== previousValue.meta.competitionId
          if (!hasCompetitionChanged && getUpdatedAtMs(payload.meta.updatedAt) <= getUpdatedAtMs(previousValue.meta.updatedAt)) {
            return previousValue
          }

          return buildTournamentModel(payload)
        })
      }
    } catch {
      // Keep local bundled data if the API is unavailable.
    }
  }, [selectedCompetitionId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const updateCompetitionFromHash = () => {
      const currentCompetitionId = parseCompetitionId(value.meta.competitionId) ?? initialCompetitionId
      setSelectedCompetitionId(parseCompetitionIdFromFragment(window.location.hash, currentCompetitionId))
    }

    updateCompetitionFromHash()
    window.addEventListener('hashchange', updateCompetitionFromHash)

    return () => {
      window.removeEventListener('hashchange', updateCompetitionFromHash)
    }
  }, [initialCompetitionId, value.meta.competitionId])

  useEffect(() => {
    const isCancelledRef = { current: false }

    void loadRemoteTournament(isCancelledRef)
    const intervalId = window.setInterval(() => {
      void loadRemoteTournament(isCancelledRef)
    }, 60_000)

    return () => {
      isCancelledRef.current = true
      window.clearInterval(intervalId)
    }
  }, [loadRemoteTournament])

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>
}

export const useTournament = () => {
  const context = useContext(TournamentContext)

  if (!context) {
    throw new Error('useTournament must be used within TournamentProvider')
  }

  return context
}
