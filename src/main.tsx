import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'flag-icons/css/flag-icons.min.css'
import './index.css'
import App from './App.tsx'
import { LocaleProvider } from './contexts/locale-context'
import { TournamentProvider } from './contexts/tournament-context'
import { DashboardProvider } from './contexts/dashboard-context'
import { ThemeProvider } from './contexts/theme-context'
import { TimeProvider } from './contexts/time-context'
import type { TournamentData } from './types/tournament'

const bootstrapTournamentData = async (): Promise<TournamentData | undefined> => {
  if (!import.meta.env.PROD) {
    return undefined
  }

  try {
    const response = await fetch(`/api/tournament?ts=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    })

    if (!response.ok) {
      return undefined
    }

    return (await response.json()) as TournamentData
  } catch {
    return undefined
  }
}

const renderApp = async () => {
  const initialTournamentData = await bootstrapTournamentData()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <TimeProvider>
            <LocaleProvider>
              <TournamentProvider initialData={initialTournamentData}>
                <DashboardProvider>
                  <App />
                </DashboardProvider>
              </TournamentProvider>
            </LocaleProvider>
          </TimeProvider>
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}

void renderApp()
