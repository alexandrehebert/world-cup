/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { TIME_ZONE_COOKIE_NAME } from '../lib/user-preferences'

const TimeContext = createContext<number | undefined>(undefined)
const TimeZoneContext = createContext<string | undefined>(undefined)

export const TimeProvider = ({
  children,
  initialNowMs,
  initialTimeZone = 'UTC',
}: {
  children: ReactNode
  initialNowMs?: number
  initialTimeZone?: string
}) => {
  const [nowMs, setNowMs] = useState(() => initialNowMs ?? Date.now())
  const [timeZone] = useState(initialTimeZone)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 10_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    document.cookie = `${TIME_ZONE_COOKIE_NAME}=${encodeURIComponent(browserTimeZone)}; Path=/; Max-Age=31536000; SameSite=Lax`
  }, [])

  const value = useMemo(() => nowMs, [nowMs])

  return (
    <TimeZoneContext.Provider value={timeZone}>
      <TimeContext.Provider value={value}>{children}</TimeContext.Provider>
    </TimeZoneContext.Provider>
  )
}

export const useNow = () => {
  const context = useContext(TimeContext)

  if (context === undefined) {
    throw new Error('useNow must be used within TimeProvider')
  }

  return context
}

export const useTimeZone = () => {
  const context = useContext(TimeZoneContext)

  if (!context) {
    throw new Error('useTimeZone must be used within TimeProvider')
  }

  return context
}