/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import Script from 'next/script'
import {
  LOCALE_COOKIE_NAME,
  THEME_PREFERENCE_COOKIE_NAME,
  isLocaleCode,
  isThemePreference,
  resolveThemeColorScheme,
} from '../lib/user-preferences'
import './globals.css'

export const metadata: Metadata = {
  title: 'FIFA World Cup 2026',
  description: 'World Cup dashboard with live results, fixtures, groups, and bracket.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: ['/icon.svg'],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const cookieTheme = cookieStore.get(THEME_PREFERENCE_COOKIE_NAME)?.value
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value
  const initialTheme = isThemePreference(cookieTheme) ? cookieTheme : undefined
  const initialColorScheme = initialTheme ? resolveThemeColorScheme(initialTheme) : undefined
  const acceptLanguageHeader = headerStore.get('accept-language') ?? ''
  const initialLocale = isLocaleCode(cookieLocale) ? cookieLocale : (acceptLanguageHeader.toLowerCase().startsWith('fr') ? 'fr' : 'en')

  return (
    <html lang={initialLocale} suppressHydrationWarning data-theme={initialTheme} style={initialColorScheme ? { colorScheme: initialColorScheme } : undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Material+Symbols+Rounded:wght,FILL,GRAD@300..700,0..1,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
              const locale = storedLocale === 'en' || storedLocale === 'fr'
                ? storedLocale
                : (navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en');

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
        {children}
      </body>
    </html>
  )
}
