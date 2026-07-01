import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'flag-icons/css/flag-icons.min.css'
import './index.css'
import App from './App'
import { LocaleProvider } from './contexts/locale-context'
import { TournamentProvider } from './contexts/tournament-context'
import { DashboardProvider } from './contexts/dashboard-context'
import { ThemeProvider } from './contexts/theme-context'
import { TimeProvider } from './contexts/time-context'
import type { TournamentData } from './types/tournament'
import { getTournamentApiRequestUrl } from './lib/tournament-api'

const BOOTSTRAP_LOADER_MIN_VISIBLE_MS = 420
const BOOTSTRAP_LOADER_FADE_MS = 300
const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const bootstrapLoaderShownAt = getNow()

const bootstrapTournamentData = async (): Promise<TournamentData | undefined> => {
  try {
    const response = await fetch(getTournamentApiRequestUrl(), {
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

const waitForNextFrame = async () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))

const hideBootstrapLoader = async () => {
  const loader = document.getElementById('loader-root')
  if (!loader) {
    return
  }

  if (document.fonts) {
    await document.fonts.ready
  }

  await waitForNextFrame()
  await waitForNextFrame()

  const elapsedMs = getNow() - bootstrapLoaderShownAt
  const remainingVisibleMs = Math.max(0, BOOTSTRAP_LOADER_MIN_VISIBLE_MS - elapsedMs)
  if (remainingVisibleMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingVisibleMs))
  }

  loader.style.opacity = '0'
  loader.style.pointerEvents = 'none'

  window.setTimeout(() => {
    loader.remove()
  }, BOOTSTRAP_LOADER_FADE_MS)
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

  void hideBootstrapLoader()
}

void renderApp()
