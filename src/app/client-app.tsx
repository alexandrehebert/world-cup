/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import 'flag-icons/css/flag-icons.min.css'
import App from '../App'
import { AuthProvider } from '../contexts/auth-context'
import { BootstrapProvider } from '../contexts/bootstrap-context'
import { DashboardProvider } from '../contexts/dashboard-context'
import { LeaderboardProvider } from '../contexts/leaderboard-context'
import { LocaleProvider } from '../contexts/locale-context'
import { PredictionsProvider } from '../contexts/predictions-context'
import { ThemeProvider } from '../contexts/theme-context'
import { TimeProvider } from '../contexts/time-context'
import { TournamentProvider } from '../contexts/tournament-context'
import type { ClientBootstrapData } from '../types/bootstrap'
import type { TournamentData } from '../types/tournament'

export default function ClientApp({
  initialData,
  bootstrapData,
}: {
  initialData?: TournamentData
  bootstrapData?: ClientBootstrapData
}) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <BrowserRouter>
      <BootstrapProvider value={bootstrapData ?? null}>
        <AuthProvider initialUser={bootstrapData?.initialUser} sessionResolved={bootstrapData?.sessionResolved ?? false}>
          <ThemeProvider>
            <TimeProvider>
              <LocaleProvider>
                <TournamentProvider initialData={initialData}>
                  <PredictionsProvider
                    initialPredictions={bootstrapData?.initialPredictions}
                    initialPredictionDistributions={bootstrapData?.initialPredictionDistributions}
                  >
                    <LeaderboardProvider initialEntries={bootstrapData?.initialLeaderboard}>
                      <DashboardProvider>
                        <App />
                      </DashboardProvider>
                    </LeaderboardProvider>
                  </PredictionsProvider>
                </TournamentProvider>
              </LocaleProvider>
            </TimeProvider>
          </ThemeProvider>
        </AuthProvider>
      </BootstrapProvider>
    </BrowserRouter>
  )
}
