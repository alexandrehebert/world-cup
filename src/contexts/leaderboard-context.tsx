/* eslint-disable react-refresh/only-export-components */
'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { RankedLeaderboardEntry } from '../types/bootstrap'

interface LeaderboardContextValue {
  initialEntries: RankedLeaderboardEntry[]
}

const LeaderboardContext = createContext<LeaderboardContextValue | undefined>(undefined)

export const LeaderboardProvider = ({
  children,
  initialEntries = [],
}: {
  children: ReactNode
  initialEntries?: RankedLeaderboardEntry[]
}) => {
  return <LeaderboardContext.Provider value={{ initialEntries }}>{children}</LeaderboardContext.Provider>
}

export const useLeaderboardBootstrap = () => {
  const context = useContext(LeaderboardContext)

  if (!context) {
    throw new Error('useLeaderboardBootstrap must be used within LeaderboardProvider')
  }

  return context
}
