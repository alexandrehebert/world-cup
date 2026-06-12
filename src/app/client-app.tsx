'use client'

import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import 'flag-icons/css/flag-icons.min.css'
import App from '../App'
import { DashboardProvider } from '../contexts/dashboard-context'
import { LocaleProvider } from '../contexts/locale-context'
import { ThemeProvider } from '../contexts/theme-context'
import { TimeProvider } from '../contexts/time-context'
import { TournamentProvider } from '../contexts/tournament-context'

export default function ClientApp() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        <TimeProvider>
          <LocaleProvider>
            <TournamentProvider>
              <DashboardProvider>
                <App />
              </DashboardProvider>
            </TournamentProvider>
          </LocaleProvider>
        </TimeProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
