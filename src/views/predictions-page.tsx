import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { useLeaderboardBootstrap } from '../contexts/leaderboard-context'
import { useLocale } from '../contexts/locale-context'
import { usePredictions } from '../contexts/predictions-context'
import { useNow, useTimeZone } from '../contexts/time-context'
import { useTournament } from '../contexts/tournament-context'
import { ClosedMatchCard } from '../components/predictions/closed-match-card'
import { OpenMatchCard } from '../components/predictions/open-match-card'
import { Icon } from '../lib/icons'
import { getDateLocale, getMatchDayKey, formatNextKickoffCountdown } from '../lib/predictions'
import { useShareLink } from '../lib/use-share-link'
import type { RankedLeaderboardEntry } from '../types/bootstrap'
import type { LeaderboardEntry } from '../types/predictions'
import type { MatchRecord } from '../types/tournament'

type DayGroup = { dayLabel: string; matches: MatchRecord[] }
type LeaderboardResponse = { leaderboard: Array<LeaderboardEntry & { rank: number }> }

const buildDayGroups = (
  matches: MatchRecord[],
  locale: ReturnType<typeof useLocale>['locale'],
  todayLabel: string,
  nowMs: number,
  fallbackTimeZone: string,
): DayGroup[] => {
  const dateLocale = getDateLocale(locale)
  const groups = new Map<string, DayGroup>()
  const todayKey = getMatchDayKey(new Date(nowMs).toISOString(), fallbackTimeZone)

  for (const match of matches) {
    const date = new Date(match.kickoff)
    const resolvedTz = match.venue.timeZone ?? fallbackTimeZone
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
  const { user, isLoading } = useAuth()
  const { initialEntries } = useLeaderboardBootstrap()
  const { predictionsByMatch, isLoading: isPredictionsLoading } = usePredictions()
  const { upcomingMatches, teamsById } = useTournament()
  const navigate = useNavigate()
  const nowMs = useNow()
  const timeZone = useTimeZone()
  const { isCopied: isLeaderboardCopied, share: shareLeaderboard } = useShareLink('/leaderboard')
  const [isLeaderboardDrawerOpen, setIsLeaderboardDrawerOpen] = useState(false)
  const [leaderboardEntries, setLeaderboardEntries] = useState<RankedLeaderboardEntry[]>(initialEntries)

  useEffect(() => {
    if (!isLeaderboardDrawerOpen) {
      return
    }

    let isCancelled = false

    void fetch('/api/leaderboard?limit=100', {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          return
        }
        const payload = (await response.json()) as LeaderboardResponse
        if (!isCancelled) {
          setLeaderboardEntries(payload.leaderboard)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLeaderboardEntries([])
        }
      })

    return () => {
      isCancelled = true
    }
  }, [isLeaderboardDrawerOpen])

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
    () => buildDayGroups(openMatches, locale, t.labels.today, nowMs, timeZone),
    [openMatches, locale, nowMs, t.labels.today, timeZone],
  )

  const groupedClosed = useMemo(
    () => buildDayGroups(closedMatches, locale, t.labels.today, nowMs, timeZone),
    [closedMatches, locale, nowMs, t.labels.today, timeZone],
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
          const resolvedTz = match.venue.timeZone ?? timeZone
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
  }, [openMatches, closedMatches, locale, timeZone, todayKey, t.labels.today])

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
            label={t.labels.viewLeaderboard}
            iconName="leaderboard"
            onClick={() => setIsLeaderboardDrawerOpen(true)}
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
      ) : null}

      {!isPredictionsLoading ? (
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
                <DesktopDaySection key={section.dayKey} section={section} />
              ))}
            </div>
            <div className="space-y-6">
              {desktopRightSections.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">{t.labels.noPredictionMatches}</p>
              ) : desktopRightSections.map((section) => (
                <DesktopDaySection key={section.dayKey} section={section} />
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
                    ? <OpenMatchCard key={match.id} match={match} />
                    : <ClosedMatchCard key={match.id} match={match} />,
                )}
              </DaySection>
            ) : null}

            {mobileOpenNonToday.map((group) => (
              <DaySection key={group.dayLabel} dayLabel={group.dayLabel} accent>
                {group.matches.map((m) => <OpenMatchCard key={m.id} match={m} />)}
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

      {isLeaderboardDrawerOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm" onClick={() => setIsLeaderboardDrawerOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t.headings.leaderboard}
            className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-lg font-semibold text-[var(--text-strong)]">{t.headings.leaderboard}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void shareLeaderboard()}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)] text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface)] sm:h-auto sm:w-auto sm:gap-1 sm:px-2 sm:py-1"
                >
                  <Icon name={isLeaderboardCopied ? 'check' : 'share'} className="text-[16px]" />
                  <span className="hidden sm:inline">{isLeaderboardCopied ? t.labels.copied : t.labels.shareLeaderboard}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLeaderboardDrawerOpen(false)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--text)] transition hover:text-[var(--text-strong)]"
                  aria-label={t.labels.close}
                >
                  <Icon name="close" className="text-[20px] leading-none" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <div className="overflow-x-auto bg-[var(--surface)]">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">{t.labels.player}</th>
                      <th className="px-4 py-3">{t.labels.points}</th>
                      <th className="px-4 py-3">{t.labels.predictions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardEntries.length > 0 ? (
                      leaderboardEntries.map((entry) => (
                        <tr
                          key={entry.userId}
                          tabIndex={0}
                          role="button"
                          aria-label={`${t.labels.viewProfile}: ${entry.username}`}
                          onClick={() => {
                            setIsLeaderboardDrawerOpen(false)
                            navigate(`/profile/${encodeURIComponent(entry.username)}`)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              setIsLeaderboardDrawerOpen(false)
                              navigate(`/profile/${encodeURIComponent(entry.username)}`)
                            }
                          }}
                          className="border-b border-[var(--border)] text-[var(--text)] transition hover:bg-[var(--surface-soft)] focus-visible:bg-[var(--surface-soft)] focus-visible:outline-none last:border-b-0"
                        >
                          <td className="px-4 py-3">{entry.rank}</td>
                          <td className="px-4 py-3 font-semibold text-[var(--accent-text)]">{entry.username}</td>
                          <td className="px-4 py-3">{entry.points}</td>
                          <td className="px-4 py-3">{entry.predictionsCount}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-4 text-[var(--text-muted)]" colSpan={4}>
                          {locale === 'fr' ? 'Aucun joueur classé pour le moment.' : 'No ranked players yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const DesktopDaySection = ({
  section,
}: {
  section: { dayKey: string; dayLabel: string; items: { match: MatchRecord; isOpen: boolean }[] }
}) => (
  <DaySection dayLabel={section.dayLabel} accent={section.items.some((i) => i.isOpen)}>
    {[...section.items]
      .sort((a, b) => a.match.kickoff.localeCompare(b.match.kickoff))
      .map(({ match, isOpen }) =>
        isOpen
          ? <OpenMatchCard key={match.id} match={match} />
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
