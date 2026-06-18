import { useMemo } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { usePredictions } from '../../contexts/predictions-context'
import { useNow } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate, getDisplayMatchStatus, getLocalizedText, getMatchDisplayTime, hasDisplayScore } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'
import { LivePulse } from '../ui/live-pulse'
import { StatusPill } from '../ui/status-pill'
import type { MatchRecord } from '../../types/tournament'
import type { MatchOutcome } from '../../types/predictions'

const getDateLocale = (locale: ReturnType<typeof useLocale>['locale']) => (locale === 'fr' ? 'fr-FR' : 'en-GB')

const getMatchDayKey = (kickoff: string, timeZone?: string) => {
  const date = new Date(kickoff)
  const resolvedTimeZone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: resolvedTimeZone,
  }).format(date)
}

const statusLabel = (status: MatchRecord['status'], labels: ReturnType<typeof useLocale>['t']['labels']) => {
  if (status === 'live') {
    return labels.live
  }

  if (status === 'finished') {
    return labels.finished
  }

  return labels.scheduled
}

const stageLabel = (stage: MatchRecord['stage'], labels: ReturnType<typeof useLocale>['t']['labels']) => {
  if (stage === 'group') {
    return labels.stageGroup
  }

  if (stage === 'roundOf32') {
    return labels.stageRoundOf32
  }

  if (stage === 'roundOf16') {
    return labels.stageRoundOf16
  }

  if (stage === 'quarterFinal') {
    return labels.stageQuarterFinal
  }

  if (stage === 'semiFinal') {
    return labels.stageSemiFinal
  }

  if (stage === 'thirdPlace') {
    return labels.stageThirdPlace
  }

  return labels.stageFinal
}

export const MatchesList = ({
  matches,
  compact = false,
  showQuickPrediction = false,
}: {
  matches: MatchRecord[]
  compact?: boolean
  showQuickPrediction?: boolean
}) => {
  const { locale, t } = useLocale()
  const { isFavoriteTeam, favoriteTeamIds, setSelectedMatchId, setSelectedTeamId } = useDashboard()
  const { user, openAuthModal } = useAuth()
  const { predictionsByMatch, savePrediction, savingMatchId } = usePredictions()
  const { teamsById } = useTournament()
  const nowMs = useNow()
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const anyFavoriteVisible = useMemo(
    () => favoriteTeamIds.length > 0 && matches.some((m) => (m.home.teamId && favoriteTeamIds.includes(m.home.teamId)) || (m.away.teamId && favoriteTeamIds.includes(m.away.teamId))),
    [favoriteTeamIds, matches],
  )
  const groupedMatches = useMemo(() => {
    const dateLocale = getDateLocale(locale)
    const groups = new Map<string, { dayLabel: string; matches: MatchRecord[] }>()
    const todayKey = getMatchDayKey(new Date().toISOString())

    for (const match of matches) {
      const date = new Date(match.kickoff)
      const resolvedTimeZone = match.venue.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
      const dayKey = getMatchDayKey(match.kickoff, match.venue.timeZone)
      const existingGroup = groups.get(dayKey)

      if (existingGroup) {
        existingGroup.matches.push(match)
        continue
      }

      groups.set(dayKey, {
        dayLabel: dayKey === todayKey
          ? t.labels.today
          : new Intl.DateTimeFormat(dateLocale, {
              dateStyle: 'full',
              timeZone: resolvedTimeZone,
            }).format(date),
        matches: [match],
      })
    }

    return [...groups.values()]
  }, [locale, matches, t.labels.today])

  return (
    <div className="space-y-6">
      {groupedMatches.map((group) => (
        <section key={group.dayLabel}>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]">{group.dayLabel}</p>
            <span className="flex-1 border-t border-[var(--border)]" />
          </div>
          <div className={`grid grid-cols-1 gap-3 ${compact ? 'lg:grid-cols-2' : 'xl:grid-cols-2'}`}>
            {group.matches.map((match) => {
              const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
              const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
              const homeTeamLabel = homeTeam ? t.teams[homeTeam.id] ?? getLocalizedText(homeTeam.name, locale) ?? homeTeam.code : 'TBD'
              const awayTeamLabel = awayTeam ? t.teams[awayTeam.id] ?? getLocalizedText(awayTeam.name, locale) ?? awayTeam.code : 'TBD'
              const { localDateTime } = formatMatchDate(match.kickoff, locale, localTimeZone, t.labels.today)
              const { localTime: venueLocalTime } = formatMatchDate(
                match.kickoff,
                locale,
                match.venue.timeZone,
                t.labels.today,
              )
              const minutesUntilKickoff = Math.ceil((new Date(match.kickoff).getTime() - nowMs) / 60000)
              const isVerySoon = match.status === 'scheduled' && minutesUntilKickoff > 0 && minutesUntilKickoff < 60
              const minuteLabel =
                locale === 'fr'
                  ? `dans ${minutesUntilKickoff} ${minutesUntilKickoff === 1 ? 'minute' : 'minutes'}`
                  : `in ${minutesUntilKickoff} ${minutesUntilKickoff === 1 ? 'minute' : 'minutes'}`
              const displayStatus = getDisplayMatchStatus(match, nowMs)
              const isLive = displayStatus === 'live'
              const isFinished = displayStatus === 'finished'
              const displayTiming = getMatchDisplayTime(match, t.labels, nowMs, locale)
              const displayDateTime = displayTiming ?? (isVerySoon ? minuteLabel : localDateTime)
              const displayLocalTime = venueLocalTime
              const displayScore = hasDisplayScore(match, nowMs)
              const homeScore = typeof match.home.score === 'number' ? match.home.score : null
              const awayScore = typeof match.away.score === 'number' ? match.away.score : null
              const homeWon = isFinished && homeScore !== null && awayScore !== null && homeScore > awayScore
              const awayWon = isFinished && homeScore !== null && awayScore !== null && awayScore > homeScore
              const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
              const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
              const hasFavorite = homeIsFavorite || awayIsFavorite
              const stadiumLabel = getLocalizedText(match.venue.stadium, locale)
              const cityLabel = getLocalizedText(match.venue.city, locale)
              const countryLabel = getLocalizedText(match.venue.country, locale)
              const locationLabel = [cityLabel, countryLabel].filter((value): value is string => Boolean(value)).join(', ')
              const venueLabel = [stadiumLabel, locationLabel].filter((value): value is string => Boolean(value)).join(' · ')
              const isPredictionOpen = match.status === 'scheduled' && new Date(match.kickoff).getTime() > nowMs
              const prediction = predictionsByMatch[match.id]
              const selectedOutcome = prediction?.outcome
              const isSavingPrediction = savingMatchId === match.id

              const quickOptions: Array<{ value: MatchOutcome; label: string }> = [
                { value: 'home', label: homeTeamLabel },
                { value: 'draw', label: locale === 'fr' ? 'Nul' : 'Draw' },
                { value: 'away', label: awayTeamLabel },
              ]

              return (
                <div
                  key={match.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedMatchId(match.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedMatchId(match.id)
                    }
                  }}
                  className={`relative w-full cursor-pointer px-5 py-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    isFinished
                      ? 'past-match-stripes bg-[var(--surface-soft)] opacity-60 saturate-50'
                      : hasFavorite
                        ? 'bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)]'
                        : anyFavoriteVisible
                          ? 'bg-[var(--surface)] opacity-75 hover:opacity-100'
                          : 'bg-[var(--surface)] hover:bg-[var(--surface-strong)]'
                  } ${hasFavorite ? 'border-l-4 border-l-[var(--accent)]' : isLive ? 'border-l-2 border-l-[var(--accent)]' : ''}`}
                >
                  <div className="flex w-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                          {stageLabel(match.stage, t.labels)}
                        </p>
                        <p className={`${compact ? 'mt-1 text-sm' : 'mt-1 text-base'} font-semibold text-[var(--text-strong)]`}>{displayDateTime}</p>
                      </div>
                      <StatusPill
                        status={displayStatus}
                        className={displayStatus === 'live' ? 'bg-transparent' : ''}
                        label={
                          displayStatus === 'live'
                            ? <span className="inline-flex items-center gap-1.5"><LivePulse className="h-3 w-3" /><span>{statusLabel(displayStatus, t.labels)}</span></span>
                            : statusLabel(displayStatus, t.labels)
                        }
                      />
                    </div>

                    <div className="flex flex-nowrap items-center gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
                      <div className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
                        {homeTeam && <FlagAvatar team={homeTeam} className="h-6 w-6 sm:h-12 sm:w-12" />}
                        <div className="min-w-0">
                          {homeTeam ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedTeamId(homeTeam.id) }}
                              className="inline-flex max-w-full cursor-pointer items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--text-strong)] hover:text-[var(--accent-text)] hover:underline"
                            >
                              <span className={homeWon ? 'text-[var(--accent-text)]' : ''}>{homeTeamLabel}</span>
                              {homeIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                            </button>
                          ) : (
                            <p className="inline-flex max-w-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--text-strong)]">
                              <span>{homeTeamLabel}</span>
                            </p>
                          )}
                          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                            {homeTeam?.code ?? 'TBD'}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 px-2 py-1 text-center sm:px-3">
                        {displayScore ? (
                          <p className="text-base font-semibold text-[var(--text-strong)] sm:text-lg">
                            {match.home.score} - {match.away.score}
                          </p>
                        ) : (
                          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-soft)]">vs</p>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                        <div className="order-2 min-w-0 text-right sm:order-1">
                          {awayTeam ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedTeamId(awayTeam.id) }}
                              className="inline-flex max-w-full cursor-pointer items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--text-strong)] hover:text-[var(--accent-text)] hover:underline"
                            >
                              <span className={awayWon ? 'text-[var(--accent-text)]' : ''}>{awayTeamLabel}</span>
                              {awayIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                            </button>
                          ) : (
                            <p className="inline-flex max-w-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--text-strong)]">
                              <span>{awayTeamLabel}</span>
                            </p>
                          )}
                          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                            {awayTeam?.code ?? 'TBD'}
                          </p>
                        </div>
                        {awayTeam && <FlagAvatar team={awayTeam} className="order-1 h-6 w-6 sm:order-2 sm:h-12 sm:w-12" />}
                      </div>
                    </div>

                    <div>
                      <p className={compact ? 'text-xs text-[var(--text-soft)]' : 'text-sm text-[var(--text-soft)]'}>
                        {t.meta.localTime} · {displayLocalTime}
                      </p>
                      <p className={compact ? 'text-xs text-[var(--text-soft)]' : 'text-sm text-[var(--text-soft)]'}>
                        {venueLabel}
                      </p>
                    </div>
                  </div>

                  {showQuickPrediction && isPredictionOpen ? (
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      {!user ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            {quickOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openAuthModal('login') }}
                                className="truncate bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[var(--text)]"
                                title={option.label}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">
                            {locale === 'fr' ? 'Connecte-toi pour pronostiquer.' : 'Sign in to predict.'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {quickOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              disabled={isSavingPrediction}
                              onClick={(e) => {
                                e.stopPropagation()
                                void savePrediction({ matchId: match.id, outcome: option.value })
                              }}
                              className={`truncate px-2 py-1 text-xs font-semibold ${
                                selectedOutcome === option.value
                                  ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]'
                                  : 'bg-[var(--surface-soft)] text-[var(--text)]'
                              } disabled:opacity-50`}
                              title={option.label}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
