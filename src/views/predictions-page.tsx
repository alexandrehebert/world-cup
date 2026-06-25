import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { useLocale } from '../contexts/locale-context'
import { usePredictions } from '../contexts/predictions-context'
import { useNow } from '../contexts/time-context'
import { useTournament } from '../contexts/tournament-context'
import { ClosedMatchCard } from '../components/predictions/closed-match-card'
import { OpenMatchCard } from '../components/predictions/open-match-card'
import { usePredictionDrafts } from '../components/predictions/use-prediction-drafts'
import { FeedbackPopup } from '../components/ui/feedback-popup'
import { Icon } from '../lib/icons'
import { getDateLocale, getMatchDayKey, formatNextKickoffCountdown } from '../lib/predictions'
import { useShareLink } from '../lib/use-share-link'
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
  const navigate = useNavigate()
  const nowMs = useNow()
  const drafts = usePredictionDrafts()
  const { isCopied: isLeaderboardCopied, share: shareLeaderboard } = useShareLink('/leaderboard')

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

  const desktopDaySections = useMemo(() => {
    const dateLocale = getDateLocale(locale)
    const dayMap = new Map<string, { dayKey: string; dayLabel: string; items: { match: MatchRecord; isOpen: boolean }[] }>()

    const add = (matches: MatchRecord[], isOpen: boolean) => {
      for (const match of matches) {
        const dayKey = getMatchDayKey(match.kickoff, match.venue.timeZone)
        const existing = dayMap.get(dayKey)
        if (existing) {
          existing.items.push({ match, isOpen })
        } else {
          const date = new Date(match.kickoff)
          const resolvedTz = match.venue.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
          const dayLabel = dayKey === todayKey
            ? t.labels.today
            : new Intl.DateTimeFormat(dateLocale, { dateStyle: 'full', timeZone: resolvedTz }).format(date)
          dayMap.set(dayKey, { dayKey, dayLabel, items: [{ match, isOpen }] })
        }
      }
    }

    add(openMatches, true)
    add(closedMatches, false)
    return [...dayMap.values()]
  }, [openMatches, closedMatches, locale, todayKey, t.labels.today])

  const desktopLeftSections = useMemo(
    () => desktopDaySections
      .filter((s) => s.dayKey <= todayKey)
      .sort((a, b) => b.dayKey.localeCompare(a.dayKey)),
    [desktopDaySections, todayKey],
  )

  const desktopRightSections = useMemo(
    () => desktopDaySections
      .filter((s) => s.dayKey > todayKey)
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey)),
    [desktopDaySections, todayKey],
  )

  const actionButtonClassName = 'appearance-none inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold leading-normal text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)] sm:w-auto sm:justify-start sm:gap-2 sm:px-3 sm:py-2'

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.predictions}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <TopActionButton
            label={isLeaderboardCopied ? t.labels.copied : t.labels.shareLeaderboard}
            iconName={isLeaderboardCopied ? 'check' : 'share'}
            onClick={() => void shareLeaderboard()}
            className={actionButtonClassName}
          />
          <TopActionButton
            label={t.labels.viewLeaderboard}
            iconName="leaderboard"
            onClick={() => navigate('/leaderboard')}
            className={actionButtonClassName}
          />
          {user ? (
            <TopActionButton
              label={t.labels.myProfile}
              iconName="person"
              onClick={() => navigate(`/profile/${encodeURIComponent(user.username)}`)}
              className={actionButtonClassName}
            />
          ) : null}
        </div>
      </div>

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
          {/* DESKTOP: left = today + past | right = future */}
          <div className="hidden xl:grid xl:grid-cols-2 xl:items-start xl:gap-8">
            <div className="space-y-6">
              {nextMatchMessage ? (
                <div className="bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--accent-text)]">
                  {nextMatchMessage}
                </div>
              ) : null}
              {desktopLeftSections.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">{t.labels.noPastPredictions}</p>
              ) : desktopLeftSections.map((section) => (
                <DesktopDaySection key={section.dayKey} section={section} drafts={drafts} />
              ))}
            </div>
            <div className="space-y-6">
              {desktopRightSections.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">{t.labels.noPredictionMatches}</p>
              ) : desktopRightSections.map((section) => (
                <DesktopDaySection key={section.dayKey} section={section} drafts={drafts} />
              ))}
            </div>
          </div>

          {/* MOBILE: today mixed → future → past */}
          <div className="space-y-6 xl:hidden">
            {mobileTodayMatches.length === 0 && openMatches.length === 0 ? (
              <div className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">{t.labels.noPredictionMatches}</div>
            ) : null}

            {mobileTodayMatches.length > 0 ? (
              <DaySection dayLabel={t.labels.today} accent>
                {nextMatchMessage ? (
                  <div className="bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--accent-text)]">
                    {nextMatchMessage}
                  </div>
                ) : null}
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

const DesktopDaySection = ({
  section,
  drafts,
}: {
  section: { dayKey: string; dayLabel: string; items: { match: MatchRecord; isOpen: boolean }[] }
  drafts: ReturnType<typeof usePredictionDrafts>
}) => (
  <DaySection dayLabel={section.dayLabel} accent={section.items.some((i) => i.isOpen)}>
    {[...section.items]
      .sort((a, b) => a.match.kickoff.localeCompare(b.match.kickoff))
      .map(({ match, isOpen }) =>
        isOpen
          ? <OpenMatchCard key={match.id} match={match} drafts={drafts} />
          : <ClosedMatchCard key={match.id} match={match} />,
      )}
  </DaySection>
)

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

const TopActionButton = ({
  label,
  iconName,
  onClick,
  className,
}: {
  label: string
  iconName: string
  onClick: () => void
  className: string
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`cursor-pointer ${className}`}
    aria-label={label}
  >
    <Icon name={iconName} className="text-[20px] leading-none sm:text-[18px]" />
    <span className="hidden sm:inline">{label}</span>
  </button>
)
