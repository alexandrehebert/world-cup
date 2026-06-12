import type { Metadata } from 'next'
import Script from 'next/script'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
              const stored = window.localStorage.getItem(storageKey);
              const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
              const theme = stored === 'light' || stored === 'dark' || stored === 'colorblind' ? stored : systemTheme;

              document.documentElement.setAttribute('data-theme', theme);
              document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
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
