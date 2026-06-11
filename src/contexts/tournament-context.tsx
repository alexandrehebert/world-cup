/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import rawTournamentData from '../data/worldcup.json'
import { buildTournamentModel, type TournamentModel } from '../lib/tournament'
import type { TournamentData } from '../types/tournament'

const localTournamentModel = buildTournamentModel(rawTournamentData as TournamentData)

const TournamentContext = createContext<TournamentModel | undefined>(undefined)

export const TournamentProvider = ({ children }: { children: ReactNode }) => {
  const [value, setValue] = useState<TournamentModel>(localTournamentModel)

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return
    }

    let isCancelled = false

    const loadRemoteTournament = async () => {
      try {
        const response = await fetch('/api/tournament', { cache: 'no-store' })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as TournamentData

        if (!isCancelled) {
          setValue(buildTournamentModel(payload))
        }
      } catch {
        // Keep local bundled data if the API is unavailable.
      }
    }

    void loadRemoteTournament()

    return () => {
      isCancelled = true
    }
  }, [])

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>
}

export const useTournament = () => {
  const context = useContext(TournamentContext)

  if (!context) {
    throw new Error('useTournament must be used within TournamentProvider')
  }

  return context
}
