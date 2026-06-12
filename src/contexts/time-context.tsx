/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const TimeContext = createContext<number | undefined>(undefined)

export const TimeProvider = ({ children }: { children: ReactNode }) => {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const value = useMemo(() => nowMs, [nowMs])

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>
}

export const useNow = () => {
  const context = useContext(TimeContext)

  if (context === undefined) {
    throw new Error('useNow must be used within TimeProvider')
  }

  return context
}