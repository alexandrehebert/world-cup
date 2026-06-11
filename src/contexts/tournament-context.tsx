/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import rawTournamentData from '../data/worldcup.json'
import { buildTournamentModel, type TournamentModel } from '../lib/tournament'
import type { TournamentData } from '../types/tournament'

const tournamentModel = buildTournamentModel(rawTournamentData as TournamentData)

const TournamentContext = createContext<TournamentModel | undefined>(undefined)

export const TournamentProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo(() => tournamentModel, [])

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>
}

export const useTournament = () => {
  const context = useContext(TournamentContext)

  if (!context) {
    throw new Error('useTournament must be used within TournamentProvider')
  }

  return context
}
