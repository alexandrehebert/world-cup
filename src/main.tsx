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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LocaleProvider>
          <TournamentProvider>
            <DashboardProvider>
              <App />
            </DashboardProvider>
          </TournamentProvider>
        </LocaleProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
