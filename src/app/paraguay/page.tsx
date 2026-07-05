/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { Card } from '../../components/ui/card'
import { LOCALE_COOKIE_NAME, isLocaleCode } from '../../lib/user-preferences'
import { de } from '../../translations/de'
import { en } from '../../translations/en'
import { es } from '../../translations/es'
import { fr } from '../../translations/fr'
import { resolveLocaleFromLanguage } from '../../translations/intl'
import type { TranslationSet } from '../../translations/types'
import type { LocaleCode } from '../../types/tournament'

const translationsByLocale: Record<LocaleCode, TranslationSet> = {
  en,
  fr,
  es,
  de,
}

const resolvePageLocale = async (): Promise<LocaleCode> => {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value

  if (isLocaleCode(cookieLocale)) {
    return cookieLocale
  }

  return resolveLocaleFromLanguage(headerStore.get('accept-language'))
}

const getPageTranslations = async () => {
  const locale = await resolvePageLocale()
  return translationsByLocale[locale]
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getPageTranslations()

  return {
    title: t.labels.paraguayPageMetaTitle,
    description: t.labels.paraguayPageMetaDescription,
    openGraph: {
      title: t.labels.paraguayPageMetaTitle,
      description: t.labels.paraguayPageMetaDescription,
    },
    twitter: {
      title: t.labels.paraguayPageMetaTitle,
      description: t.labels.paraguayPageMetaDescription,
    },
  }
}

export default async function ParaguayPage() {
  const t = await getPageTranslations()
  const stats = [
    { label: t.labels.paraguayModalStatWorldCups, value: '0', note: t.labels.paraguayPageStatWorldCupTitlesNote },
    { label: t.labels.paraguayModalStatFinalsPlayed, value: '0', note: t.labels.paraguayPageStatFinalsPlayedNote },
    { label: t.labels.paraguayPageStatBestFinishLabel, value: t.labels.paraguayPageStatBestFinishValue, note: t.labels.paraguayPageStatBestFinishNote },
    { label: t.labels.paraguayPageStatGoldenBootsLabel, value: '0', note: t.labels.paraguayPageStatGoldenBootsNote },
    { label: t.labels.paraguayPageStatFinalGoalsLabel, value: '0', note: t.labels.paraguayPageStatFinalGoalsNote },
    { label: t.labels.paraguayModalStatCurrentLocation, value: t.labels.paraguayModalCurrentLocationValue, note: t.labels.paraguayPageStatCurrentLocationNote },
  ] as const

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 md:px-8">
      <header className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">{t.labels.paraguayPageBadge}</p>
        <h1 className="text-3xl font-extrabold text-[var(--text-strong)] md:text-5xl">{t.labels.paraguayPageHeading}</h1>
        <p className="max-w-3xl text-sm text-[var(--text-muted)] md:text-base">
          {t.labels.paraguayPageIntro}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border border-[var(--border)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">{stat.label}</p>
            <p className="mt-2 text-3xl font-black text-[var(--text-strong)]">{stat.value}</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{stat.note}</p>
          </Card>
        ))}
      </section>

      <Card className="mt-6 border border-[var(--accent-border)] bg-[var(--accent-muted)] p-5">
        <h2 className="text-lg font-bold text-[var(--text-strong)]">{t.labels.paraguayPageExecutiveSummaryTitle}</h2>
        <p className="mt-2 text-sm text-[var(--text)]">
          {t.labels.paraguayPageExecutiveSummaryBody}
        </p>
      </Card>
    </main>
  )
}
