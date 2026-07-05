/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import Script from 'next/script'
import { getActiveCompetitionProfile } from '../competitions'
import { usesStandingsSectionPath } from '../lib/competition-sections'
import { materialSymbolsRounded } from './fonts'
import { getActiveCompetitionAppIcons, getActiveCompetitionLoaderIconAsset } from '../lib/competition-branding'
import { loadTournamentData } from '../server/tournament-data'
import { StartupLoader } from './startup-loader'
import {
  LOCALE_COOKIE_NAME,
  THEME_PREFERENCE_COOKIE_NAME,
  isLocaleCode,
  isThemePreference,
  resolveThemeColorScheme,
} from '../lib/user-preferences'
import { resolveLocaleFromLanguage } from '../translations/intl'
import './globals.css'
import 'flag-icons/css/flag-icons.min.css'

const appIcons = getActiveCompetitionAppIcons()
const activeCompetition = getActiveCompetitionProfile()
const startupLoaderIconAsset = getActiveCompetitionLoaderIconAsset()

export const generateMetadata = async (): Promise<Metadata> => {
  const tournament = await loadTournamentData()
  const title = tournament.meta.edition || activeCompetition.displayName

  return {
    title,
    description: `${activeCompetition.shortName} dashboard with live results, fixtures, ${
      usesStandingsSectionPath(activeCompetition.id) ? 'standings' : 'groups'
    }, and bracket.`,
    icons: {
      icon: [
        { url: appIcons.icon, type: 'image/svg+xml' },
        { url: appIcons.favicon, type: 'image/svg+xml' },
      ],
      shortcut: [appIcons.icon],
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const cookieTheme = cookieStore.get(THEME_PREFERENCE_COOKIE_NAME)?.value
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value
  const initialTheme = isThemePreference(cookieTheme) ? cookieTheme : undefined
  const initialColorScheme = initialTheme ? resolveThemeColorScheme(initialTheme) : undefined
  const acceptLanguageHeader = headerStore.get('accept-language') ?? ''
  const initialLocale = isLocaleCode(cookieLocale)
    ? cookieLocale
    : resolveLocaleFromLanguage(acceptLanguageHeader)

  return (
    <html
      lang={initialLocale}
      suppressHydrationWarning
      data-theme={initialTheme}
      data-competition-id={activeCompetition.id}
      style={initialColorScheme ? { colorScheme: initialColorScheme } : undefined}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={materialSymbolsRounded.variable}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const storageKey = 'theme-preference';
              const cookieKey = 'theme-preference';
              const localeStorageKey = 'locale';
              const localeCookieKey = 'locale';
              const timeZoneCookieKey = 'time-zone';
              const stored = window.localStorage.getItem(storageKey);
              const storedLocale = window.localStorage.getItem(localeStorageKey);
              const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
              const theme = stored === 'light' || stored === 'dark' || stored === 'colorblind' ? stored : systemTheme;
              const supportedLocales = ['en', 'fr', 'es'];
              const resolveLocale = (candidate) => supportedLocales.includes(candidate) ? candidate : null;
              const detectLocaleFromLanguage = (language) => {
                const normalized = String(language || '').toLowerCase();
                const matched = supportedLocales.find((code) => code !== 'en' && normalized.startsWith(code));
                return matched || 'en';
              };
              const locale = resolveLocale(storedLocale) || detectLocaleFromLanguage(navigator.language);

              document.documentElement.setAttribute('data-theme', theme);
              document.documentElement.lang = locale;
              document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
              document.cookie = cookieKey + '=' + encodeURIComponent(theme) + '; Path=/; Max-Age=31536000; SameSite=Lax';
              document.cookie = localeCookieKey + '=' + encodeURIComponent(locale) + '; Path=/; Max-Age=31536000; SameSite=Lax';
              document.cookie = timeZoneCookieKey + '=' + encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') + '; Path=/; Max-Age=31536000; SameSite=Lax';
            } catch {
              // Keep default behavior when storage is unavailable.
            }
          })();`}
        </Script>
        <StartupLoader loaderIconAsset={startupLoaderIconAsset} />
        {children}
      </body>
    </html>
  )
}
