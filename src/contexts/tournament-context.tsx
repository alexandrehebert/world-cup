/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import rawTournamentData from '../data/worldcup.json'
import { buildTournamentModel, type TournamentModel } from '../lib/tournament'
import { getTournamentApiRequestUrl } from '../lib/tournament-api'
import type { TournamentData } from '../types/tournament'

const localTournamentData = rawTournamentData as TournamentData
const localTournamentModel = buildTournamentModel(localTournamentData)

const TournamentContext = createContext<TournamentModel | undefined>(undefined)

export const TournamentProvider = ({ children, initialData }: { children: ReactNode; initialData?: TournamentData }) => {
  const [value, setValue] = useState<TournamentModel>(() => {
    if (initialData) {
      return buildTournamentModel(initialData)
    }

    return localTournamentModel
  })

  const loadRemoteTournament = useCallback(async (isCancelledRef?: { current: boolean }) => {
    try {
      const response = await fetch(getTournamentApiRequestUrl(), {
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
          if (previousValue.meta.updatedAt === payload.meta.updatedAt) {
            return previousValue
          }

          return buildTournamentModel(payload)
        })
      }
    } catch {
      // Keep local bundled data if the API is unavailable.
    }
  }, [])

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
