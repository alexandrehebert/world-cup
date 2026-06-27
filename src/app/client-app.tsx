'use client'

import { BrowserRouter, MemoryRouter } from 'react-router-dom'
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
  initialPath = '/',
}: {
  initialData?: TournamentData
  bootstrapData?: ClientBootstrapData
  initialPath?: string
}) {
  const isServerRender = typeof window === 'undefined'
  const Router = isServerRender ? MemoryRouter : BrowserRouter
  const routerProps = isServerRender ? { initialEntries: [initialPath] } : undefined

  return (
    <Router {...routerProps}>
      <BootstrapProvider value={bootstrapData ?? null}>
        <AuthProvider initialUser={bootstrapData?.initialUser} sessionResolved={bootstrapData?.sessionResolved ?? false}>
          <ThemeProvider initialThemePreference={bootstrapData?.initialThemePreference ?? undefined}>
            <TimeProvider initialNowMs={bootstrapData?.initialNowMs} initialTimeZone={bootstrapData?.initialTimeZone}>
              <LocaleProvider initialLocale={bootstrapData?.initialLocale}>
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
    </Router>
  )
}
