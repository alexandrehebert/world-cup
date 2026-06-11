/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface DashboardContextValue {
  selectedMatchId: string | null
  setSelectedMatchId: (matchId: string | null) => void
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined)

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  const value = useMemo(() => ({ selectedMatchId, setSelectedMatchId }), [selectedMatchId])

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export const useDashboard = () => {
  const context = useContext(DashboardContext)

  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider')
  }

  return context
}
