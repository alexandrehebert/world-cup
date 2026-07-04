import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../contexts/locale-context'
import { useNow, useTimeZone } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { buildScheduleCalendarDays } from '../../lib/dashboard-schedule'
import { formatMatchDate, getLiveStatusDetail, getLocalizedCountryName, getMatchDisplayTime, getLocalizedText, hasDisplayScore } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { LivePulse } from '../ui/live-pulse'
import { FlagAvatar } from '../ui/flag-avatar'
import { StatusPill } from '../ui/status-pill'
import { useDashboard } from '../../contexts/dashboard-context'
import { useCompetitionNotifications } from '../notifications/competition-notifications'
import { NotificationFeed } from '../notifications/notifications-feed'

export const CompetitionDashboard = () => {
  const { t, locale } = useLocale()
  const { teamsById } = useTournament()
  const { setSelectedMatchId } = useDashboard()
  const nowMs = useNow()
  const localTimeZone = useTimeZone()
  const { liveMatches, liveWidgetMatches, scheduledMatches, latestResults, notifications } = useCompetitionNotifications()
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB'
  const scheduleCalendarDays = useMemo(
    () => buildScheduleCalendarDays(scheduledMatches, dateLocale, localTimeZone),
    [dateLocale, localTimeZone, scheduledMatches],
  )

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-strong)]">
              <LivePulse className="h-3 w-3" />
              {liveMatches.length > 0 ? t.labels.liveNow : t.labels.comingSoon}
            </h2>
            <Link
              to="/matches"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-soft)] transition hover:text-[var(--accent-text)]"
              aria-label={t.labels.viewMatches}
              title={t.labels.viewMatches}
            >
              <span>{t.labels.viewMatches}</span>
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
          {liveWidgetMatches.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t.labels.noScheduledMatches}</p>
          ) : (
            <div className="space-y-3">
              {liveWidgetMatches.map((match) => {
                const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                const homeTeamLabel = homeTeam ? t.teams[homeTeam.id] ?? getLocalizedText(homeTeam.name, locale) ?? homeTeam.code : t.labels.tbd
                const awayTeamLabel = awayTeam ? t.teams[awayTeam.id] ?? getLocalizedText(awayTeam.name, locale) ?? awayTeam.code : t.labels.tbd
                const displayStatus = match.status
                const displayTime = getMatchDisplayTime(match, t.labels, nowMs, locale) ?? (displayStatus === 'live' ? t.labels.live : null)
                const displayScore = hasDisplayScore(match, nowMs)
                const homeScore = typeof match.home.score === 'number' ? match.home.score : null
                const awayScore = typeof match.away.score === 'number' ? match.away.score : null
                const liveDetail = getLiveStatusDetail(match.live?.shortDetail ?? match.live?.detail ?? null, locale)
                const { localDateTime } = formatMatchDate(match.kickoff, locale, localTimeZone, t.labels.today)
                const { localTime: venueLocalTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone, t.labels.today)
                const stadiumLabel = getLocalizedText(match.venue.stadium, locale)
                const cityLabel = getLocalizedText(match.venue.city, locale)
                const countryLabel = getLocalizedCountryName(match.venue.country, locale)
                const venueTimeZone = new Intl.DateTimeFormat('en-US', {
                  timeZone: match.venue.timeZone,
                  timeZoneName: 'shortOffset',
                })
                  .formatToParts(new Date(match.kickoff))
                  .find((part) => part.type === 'timeZoneName')?.value?.replace('GMT', 'UTC').replace('UTC-0', 'UTC+0')
                  ?? 'UTC+0'

                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setSelectedMatchId(match.id)}
                    className="w-full border border-[var(--border)] bg-[var(--calendar-live-bg)] px-3 py-3 text-left transition hover:bg-[var(--calendar-live-hover-bg)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          {match.stage === 'group' ? t.labels.stageGroup : match.stage === 'roundOf16' ? t.labels.stageRoundOf16 : match.stage === 'roundOf32' ? t.labels.stageRoundOf32 : match.stage === 'quarterFinal' ? t.labels.stageQuarterFinal : match.stage === 'semiFinal' ? t.labels.stageSemiFinal : match.stage === 'thirdPlace' ? t.labels.stageThirdPlace : t.labels.stageFinal}
                        </p>
                        <StatusPill
                          status={displayStatus}
                          label={
                            <span className="inline-flex items-center gap-1.5">
                              {displayStatus === 'live' ? <LivePulse className="h-2.5 w-2.5" /> : null}
                              <span>{displayStatus === 'live' ? t.labels.live : t.labels.scheduled}</span>
                            </span>
                          }
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="min-w-0 p-2 text-center">
                          <div className="mx-auto mb-2 w-fit">
                            {homeTeam ? <FlagAvatar team={homeTeam} className="h-14 w-14" /> : <span className="block h-14 w-14 rounded-full border border-dashed border-[var(--border)]" aria-hidden="true" />}
                          </div>
                          <p className="truncate text-base font-semibold text-[var(--text-strong)] sm:text-lg">{homeTeamLabel}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{homeTeam?.code ?? t.labels.tbd}</p>
                      </div>

                        <div className="flex flex-col items-center gap-1 px-2">
                          {displayScore ? (
                            <>
                              <p className="text-3xl font-black leading-none text-[var(--text-strong)] sm:text-4xl">
                                {homeScore ?? 0} - {awayScore ?? 0}
                              </p>
                              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">{displayStatus === 'live' ? t.labels.live : t.labels.scheduled}</p>
                              {displayTime ? <p className="text-sm font-semibold text-[var(--text-strong)]">{displayTime}</p> : null}
                            </>
                          ) : (
                            <p className="text-2xl font-black uppercase tracking-[0.28em] text-[var(--text-strong)] sm:text-3xl">{t.labels.vs}</p>
                          )}
                        </div>

                        <div className="min-w-0 p-2 text-center">
                          <div className="mx-auto mb-2 w-fit">
                            {awayTeam ? <FlagAvatar team={awayTeam} className="h-14 w-14" /> : <span className="block h-14 w-14 rounded-full border border-dashed border-[var(--border)]" aria-hidden="true" />}
                          </div>
                          <p className="truncate text-base font-semibold text-[var(--text-strong)] sm:text-lg">{awayTeamLabel}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{awayTeam?.code ?? t.labels.tbd}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{t.meta.localTime}</p>
                          <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{venueLocalTime}</p>
                          <p className="text-xs text-[var(--text-soft)]">{localDateTime}</p>
                      </div>
                      <div className="border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{t.meta.venue}</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{stadiumLabel ?? t.labels.tbd}</p>
                        <p className="text-xs text-[var(--text-soft)]">
                          {[cityLabel, countryLabel].filter(Boolean).join(' · ')} · {venueTimeZone}
                        </p>
                      </div>
                    </div>
                    {liveDetail ? (
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]">{liveDetail}</p>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </article>

        <article className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--text-strong)]">{t.labels.smallSchedule}</h2>
            <Link
              to="/matches"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-soft)] transition hover:text-[var(--accent-text)]"
              aria-label={t.labels.viewSchedule}
              title={t.labels.viewSchedule}
            >
              <span>{t.labels.viewSchedule}</span>
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
          {scheduleCalendarDays.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t.labels.noScheduledMatches}</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {scheduleCalendarDays.map((day) => (
                <section key={`${day.weekday}-${day.day}`} className="border border-[var(--border)] bg-[var(--surface-soft)] p-2.5">
                  <div className="mb-2 flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{day.weekday}</p>
                    <p className="text-sm font-semibold text-[var(--text-strong)]">{day.label}</p>
                  </div>
                  <div className="space-y-1.5">
                    {day.matches.slice(0, 3).map((match) => {
                      const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                      const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                      const kickoffTime = new Intl.DateTimeFormat(dateLocale, {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: localTimeZone,
                      }).format(new Date(match.kickoff))

                      return (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => setSelectedMatchId(match.id)}
                          className="flex w-full items-center justify-between gap-2 bg-[var(--surface)] px-2 py-1.5 text-left transition hover:bg-[var(--surface-strong)]"
                        >
                          <span className="truncate text-xs text-[var(--text)]">
                            {(homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : t.labels.tbd)} {t.labels.vs}{' '}
                            {(awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : t.labels.tbd)}
                          </span>
                          <span className="shrink-0 text-[11px] text-[var(--text-soft)]">{kickoffTime}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </article>

        <article className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--text-strong)]">{t.labels.latestResults}</h2>
            <Link
              to="/matches"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-soft)] transition hover:text-[var(--accent-text)]"
              aria-label={t.labels.viewMatches}
              title={t.labels.viewMatches}
            >
              <span>{t.labels.viewMatches}</span>
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
          {latestResults.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t.labels.noLatestResults}</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {latestResults.map((match) => {
                const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined

                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setSelectedMatchId(match.id)}
                    className="w-full border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-left transition hover:border-[var(--border-strong)]"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-soft)]">{t.labels.finished}</p>
                      <p className="text-base font-semibold text-[var(--text-strong)]">
                        {hasDisplayScore(match, nowMs) ? `${match.home.score ?? 0} - ${match.away.score ?? 0}` : t.labels.finished}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        {homeTeam ? <FlagAvatar team={homeTeam} className="h-5 w-5" /> : null}
                        <span className="truncate text-sm text-[var(--text)]">{homeTeam ? t.teams[homeTeam.id] ?? homeTeam.name : t.labels.tbd}</span>
                      </span>
                      <span className="text-xs text-[var(--text-soft)]">{t.labels.vs}</span>
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm text-[var(--text)]">{awayTeam ? t.teams[awayTeam.id] ?? awayTeam.name : t.labels.tbd}</span>
                        {awayTeam ? <FlagAvatar team={awayTeam} className="h-5 w-5" /> : null}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </article>

        <article className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--text-strong)]">
            <Icon name="notifications" className="text-[18px]" />
            {t.labels.eventsSection}
          </h2>
          <NotificationFeed notifications={notifications} variant="timeline" />
        </article>
      </div>
    </section>
  )
}
