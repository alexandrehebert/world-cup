/* eslint-disable react-hooks/set-state-in-effect */
import { useMemo } from 'react'
import { useAuth } from '../contexts/auth-context'
import { useLocale } from '../contexts/locale-context'
import { usePredictions } from '../contexts/predictions-context'
import { useNow } from '../contexts/time-context'
import { useTournament } from '../contexts/tournament-context'
import { ClosedMatchCard } from '../components/predictions/closed-match-card'
import { OpenMatchCard } from '../components/predictions/open-match-card'
import { usePredictionDrafts } from '../components/predictions/use-prediction-drafts'
import { FeedbackPopup } from '../components/ui/feedback-popup'
import { getDateLocale, getMatchDayKey, formatNextKickoffCountdown } from '../lib/predictions'
import type { MatchRecord } from '../types/tournament'

type DayGroup = { dayLabel: string; matches: MatchRecord[] }

const buildDayGroups = (
  matches: MatchRecord[],
  locale: ReturnType<typeof useLocale>['locale'],
  todayLabel: string,
): DayGroup[] => {
  const dateLocale = getDateLocale(locale)
  const groups = new Map<string, DayGroup>()
  const todayKey = getMatchDayKey(new Date().toISOString())

  for (const match of matches) {
    const date = new Date(match.kickoff)
    const resolvedTz = match.venue.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    const dayKey = getMatchDayKey(match.kickoff, match.venue.timeZone)
    const existing = groups.get(dayKey)

    if (existing) {
      existing.matches.push(match)
      continue
    }

    groups.set(dayKey, {
      dayLabel: dayKey === todayKey
        ? todayLabel
        : new Intl.DateTimeFormat(dateLocale, { dateStyle: 'full', timeZone: resolvedTz }).format(date),
      matches: [match],
    })
  }

  return [...groups.values()]
}

export const PredictionsPage = () => {
  const { locale, t } = useLocale()
  const { user, isLoading, openAuthModal } = useAuth()
  const { predictionsByMatch, isLoading: isPredictionsLoading } = usePredictions()
  const { upcomingMatches, teamsById } = useTournament()
  const nowMs = useNow()
  const drafts = usePredictionDrafts()

  const openMatches = useMemo(() => {
    return upcomingMatches
      .filter((m) => {
        const hasTeams = Boolean(m.home.teamId && teamsById[m.home.teamId]) && Boolean(m.away.teamId && teamsById[m.away.teamId])
        return m.status === 'scheduled' && new Date(m.kickoff).getTime() > nowMs && hasTeams
      })
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  }, [upcomingMatches, nowMs, teamsById])

  const closedMatches = useMemo(() => {
    return upcomingMatches
      .filter((m) => {
        const hasTeams = Boolean(m.home.teamId && teamsById[m.home.teamId]) && Boolean(m.away.teamId && teamsById[m.away.teamId])
        const hasPrediction = Boolean(predictionsByMatch[m.id])
        const isStarted = m.status !== 'scheduled' || new Date(m.kickoff).getTime() <= nowMs
        return isStarted && hasPrediction && hasTeams
      })
      .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
  }, [upcomingMatches, nowMs, teamsById, predictionsByMatch])

  const nextMatchMessage = useMemo(() => {
    const next = openMatches[0]
    if (!next) return null
    const countdown = formatNextKickoffCountdown(new Date(next.kickoff).getTime(), nowMs, locale)
    return locale === 'fr' ? `Prochain match ${countdown}` : `Next match ${countdown}`
  }, [locale, nowMs, openMatches])

  const todayKey = useMemo(() => getMatchDayKey(new Date(nowMs).toISOString()), [nowMs])

  const groupedOpen = useMemo(
    () => buildDayGroups(openMatches, locale, t.labels.today),
    [openMatches, locale, t.labels.today],
  )

  const groupedClosed = useMemo(
    () => buildDayGroups(closedMatches, locale, t.labels.today),
    [closedMatches, locale, t.labels.today],
  )

  const mobileTodayMatches = useMemo(() => {
    const todayOpen = openMatches.filter((m) => getMatchDayKey(m.kickoff, m.venue.timeZone) === todayKey)
    const todayClosed = closedMatches.filter((m) => getMatchDayKey(m.kickoff, m.venue.timeZone) === todayKey)
    return [
      ...todayOpen.map((m) => ({ match: m, isOpen: true as const })),
      ...todayClosed.map((m) => ({ match: m, isOpen: false as const })),
    ].sort((a, b) => a.match.kickoff.localeCompare(b.match.kickoff))
  }, [openMatches, closedMatches, todayKey])

  const mobileOpenNonToday = useMemo(
    () => groupedOpen.filter((g) => g.dayLabel !== t.labels.today),
    [groupedOpen, t.labels.today],
  )

  const mobileClosedNonToday = useMemo(
    () => groupedClosed.filter((g) => g.dayLabel !== t.labels.today),
    [groupedClosed, t.labels.today],
  )

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.predictions}</h2>

      {user && !isPredictionsLoading && nextMatchMessage ? (
        <div className="bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--accent-text)]">
          {nextMatchMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">{t.labels.loadingSession}</div>
      ) : !user ? (
        <div className="space-y-4 bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--text-muted)]">{t.labels.signInToAccessPredictions}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="cursor-pointer bg-[var(--accent-muted)] px-3 py-2 text-sm font-semibold text-[var(--accent-text)] transition hover:brightness-105"
            >
              {t.labels.signIn}
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="cursor-pointer bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
            >
              {t.labels.createAccount}
            </button>
          </div>
        </div>
      ) : null}

      <FeedbackPopup
        message={drafts.predictionError?.message ?? null}
        onDismiss={() => drafts.setPredictionError(null)}
        dismissLabel={t.labels.close}
      />

      {user && !isPredictionsLoading ? (
        <>
          {/* DESKTOP: past/live left | upcoming right */}
          <div className="hidden xl:grid xl:grid-cols-2 xl:items-start xl:gap-8">
            <ClosedColumn groups={groupedClosed} />
            <OpenColumn groups={groupedOpen} openMatches={openMatches} drafts={drafts} />
          </div>

          {/* MOBILE: today mixed → future → past */}
          <div className="space-y-6 xl:hidden">
            {mobileTodayMatches.length === 0 && openMatches.length === 0 ? (
              <div className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">{t.labels.noPredictionMatches}</div>
            ) : null}

            {mobileTodayMatches.length > 0 ? (
              <DaySection dayLabel={t.labels.today} accent>
                {mobileTodayMatches.map(({ match, isOpen }) =>
                  isOpen
                    ? <OpenMatchCard key={match.id} match={match} drafts={drafts} />
                    : <ClosedMatchCard key={match.id} match={match} />,
                )}
              </DaySection>
            ) : null}

            {mobileOpenNonToday.map((group) => (
              <DaySection key={group.dayLabel} dayLabel={group.dayLabel} accent>
                {group.matches.map((m) => <OpenMatchCard key={m.id} match={m} drafts={drafts} />)}
              </DaySection>
            ))}

            {mobileClosedNonToday.map((group) => (
              <DaySection key={group.dayLabel} dayLabel={group.dayLabel}>
                {group.matches.map((m) => <ClosedMatchCard key={m.id} match={m} />)}
              </DaySection>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const DaySection = ({
  dayLabel,
  accent = false,
  children,
}: {
  dayLabel: string
  accent?: boolean
  children: React.ReactNode
}) => (
  <section>
    <div className="mb-3 flex items-center gap-3">
      <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${accent ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]'}`}>
        {dayLabel}
      </p>
      <span className="flex-1 border-t border-[var(--border)]" />
    </div>
    <div className="space-y-3">{children}</div>
  </section>
)

const ClosedColumn = ({ groups }: { groups: DayGroup[] }) => {
  const { t } = useLocale()
  return (
    <div className="space-y-6">
      <SectionHeader label={t.labels.pastAndLivePredictions} />
      {groups.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t.labels.noPastPredictions}</p>
      ) : groups.map((g) => (
        <DaySection key={g.dayLabel} dayLabel={g.dayLabel}>
          {g.matches.map((m) => <ClosedMatchCard key={m.id} match={m} />)}
        </DaySection>
      ))}
    </div>
  )
}

const OpenColumn = ({
  groups,
  openMatches,
  drafts,
}: {
  groups: DayGroup[]
  openMatches: MatchRecord[]
  drafts: ReturnType<typeof usePredictionDrafts>
}) => {
  const { t } = useLocale()
  return (
    <div className="space-y-6">
      <SectionHeader label={t.labels.predictions} accent />
      {openMatches.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t.labels.noPredictionMatches}</p>
      ) : groups.map((g) => (
        <DaySection key={g.dayLabel} dayLabel={g.dayLabel} accent>
          {g.matches.map((m) => <OpenMatchCard key={m.id} match={m} drafts={drafts} />)}
        </DaySection>
      ))}
    </div>
  )
}

const SectionHeader = ({ label, accent = false }: { label: string; accent?: boolean }) => (
  <div className="flex items-center gap-3">
    <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${accent ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]'}`}>
      {label}
    </p>
    <span className="flex-1 border-t border-[var(--border)]" />
  </div>
)
