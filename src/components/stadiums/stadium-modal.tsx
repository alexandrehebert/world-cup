import { useMemo } from 'react'
import { useLocale } from '../../contexts/locale-context'
import { useNow, useTimeZone } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { useTheme } from '../../contexts/theme-context'
import {
  formatMatchDate,
  getDisplayMatchStatus,
  getLocalizedCountryName,
  getLocalizedText,
  getMatchDisplayTime,
  hasDisplayScore,
} from '../../lib/format'
import { FlagAvatar } from '../ui/flag-avatar'
import { LivePulse } from '../ui/live-pulse'
import { ModalMatchSections } from '../matches/modal-match-sections'
import { StatusPill } from '../ui/status-pill'
import {
  buildStadiumMapMarkers,
  getStadiumMapViewport,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
} from '../../lib/stadiums'
import type { StadiumSummary } from '../../lib/stadiums'
import type { MatchRecord } from '../../types/tournament'
import { ModalShell } from '../ui/modal-shell'

interface StadiumModalProps {
  stadium: StadiumSummary | null
  onClose: () => void
}

const stageLabel = (
  stage: MatchRecord['stage'],
  labels: ReturnType<typeof useLocale>['t']['labels'],
) => {
  if (stage === 'group') return labels.stageGroup
  if (stage === 'roundOf32') return labels.stageRoundOf32
  if (stage === 'roundOf16') return labels.stageRoundOf16
  if (stage === 'quarterFinal') return labels.stageQuarterFinal
  if (stage === 'semiFinal') return labels.stageSemiFinal
  if (stage === 'thirdPlace') return labels.stageThirdPlace
  return labels.stageFinal
}

const getMeridianPath = (x: number) => {
  const horizontalRatio = (x - WORLD_MAP_WIDTH / 2) / (WORLD_MAP_WIDTH / 2)
  const offsetX = horizontalRatio * 30
  return `M ${x} 0 Q ${x + offsetX} ${WORLD_MAP_HEIGHT / 2} ${x} ${WORLD_MAP_HEIGHT}`
}

const getParallelPath = (y: number) => {
  const verticalRatio = (y - WORLD_MAP_HEIGHT / 2) / (WORLD_MAP_HEIGHT / 2)
  const offsetY = verticalRatio * 20
  return `M 0 ${y} Q ${WORLD_MAP_WIDTH / 2} ${y + offsetY} ${WORLD_MAP_WIDTH} ${y}`
}

export const StadiumModal = ({ stadium, onClose }: StadiumModalProps) => {
  const { locale, t } = useLocale()
  const { themePreference } = useTheme()
  const { matches, teamsById } = useTournament()
  const nowMs = useNow()
  const localTimeZone = useTimeZone()

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-US'),
    [locale],
  )

  const mapMarkers = useMemo(
    () => (stadium ? buildStadiumMapMarkers([stadium]) : []),
    [stadium],
  )
  const mapViewport = useMemo(
    () => getStadiumMapViewport(mapMarkers),
    [mapMarkers],
  )

  const mapImageHref = useMemo(() => {
    if (themePreference === 'light') {
      return '/assets/world-stadiums-map-light.svg'
    }

    if (themePreference === 'colorblind') {
      return '/assets/world-stadiums-map-colorblind.svg'
    }

    return '/assets/world-stadiums-map-dark.svg'
  }, [themePreference])

  if (!stadium) {
    return null
  }

  const firstKickoffLabel = formatMatchDate(
    stadium.firstKickoff,
    locale,
    stadium.timeZone || undefined,
    t.labels.today,
  ).localDateTime
  const lastKickoffLabel = formatMatchDate(
    stadium.lastKickoff,
    locale,
    stadium.timeZone || undefined,
    t.labels.today,
  ).localDateTime
  const seatCapacityLabel = stadium.seatCapacity
    ? `${numberFormatter.format(stadium.seatCapacity)} ${t.labels.seats}`
    : t.labels.unknown
  const openedYearLabel = stadium.openedYear ? String(stadium.openedYear) : t.labels.unknown
  const normalizeVenueText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')
  const stadiumMatches = [...matches]
    .filter((match) => `${normalizeVenueText(match.venue.stadium)}|${normalizeVenueText(match.venue.country)}` === stadium.key)
    .sort((first, second) => first.kickoff.localeCompare(second.kickoff))
  const liveMatches = stadiumMatches.filter((match) => getDisplayMatchStatus(match, nowMs) === 'live')
  const upcomingMatches = stadiumMatches.filter((match) => getDisplayMatchStatus(match, nowMs) === 'scheduled')
  const pastMatches = [...stadiumMatches]
    .filter((match) => getDisplayMatchStatus(match, nowMs) === 'finished')
    .reverse()

  const renderMatchRow = (match: MatchRecord) => {
    const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
    const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
    const homeLabel = homeTeam
      ? (t.teams[homeTeam.id] ?? getLocalizedText(homeTeam.name, locale) ?? homeTeam.code)
      : t.labels.tbd
    const awayLabel = awayTeam
      ? (t.teams[awayTeam.id] ?? getLocalizedText(awayTeam.name, locale) ?? awayTeam.code)
      : t.labels.tbd
    const displayStatus = getDisplayMatchStatus(match, nowMs)
    const isLive = displayStatus === 'live'
    const isFinished = displayStatus === 'finished'
    const displayScore = hasDisplayScore(match, nowMs)
    const homeScore = typeof match.home.score === 'number' ? match.home.score : null
    const awayScore = typeof match.away.score === 'number' ? match.away.score : null
    const { localDateTime } = formatMatchDate(match.kickoff, locale, localTimeZone, t.labels.today)
    const displayTiming = getMatchDisplayTime(match, t.labels, nowMs, locale)
    const displayDateTime = displayTiming ?? localDateTime
    const matchStageLabel = stageLabel(match.stage, t.labels)
    const venueCity = getLocalizedText(match.venue.city, locale)
    const venueCountry = getLocalizedCountryName(match.venue.country, locale)
    const venueLabel = [venueCity, venueCountry].filter(Boolean).join(', ')

    return (
      <div
        key={match.id}
        className={`w-full appearance-none rounded-none border-0 text-left transition ${
          isFinished
            ? 'past-match-stripes bg-[var(--surface-soft)] opacity-70 saturate-50 hover:opacity-90'
            : 'bg-[var(--surface)] hover:bg-[var(--surface-strong)]'
        } ${isLive ? 'border-l-2 border-l-[var(--accent)]' : ''}`}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="shrink-0 flex items-center gap-1">
            {homeTeam ? (
              <FlagAvatar team={homeTeam} className="h-7 w-7" />
            ) : (
              <span className="block h-7 w-7 rounded-full border border-[var(--border)]" aria-hidden="true" />
            )}
            {awayTeam ? (
              <FlagAvatar team={awayTeam} className="h-7 w-7" />
            ) : (
              <span className="block h-7 w-7 rounded-full border border-[var(--border)]" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-semibold text-[var(--text-strong)]">
              {isLive ? <LivePulse className="h-2.5 w-2.5 shrink-0" /> : null}
              <span className="truncate">{homeLabel} {t.labels.vs} {awayLabel}</span>
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">
              {matchStageLabel} · {displayDateTime}
            </p>
            {venueLabel ? (
              <p className="text-xs text-[var(--text-soft)]">{venueLabel}</p>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            {displayScore ? (
              <p className="text-sm font-bold text-[var(--text-strong)]">
                {homeScore} – {awayScore}
              </p>
            ) : isLive ? (
              <StatusPill
                status="live"
                label={<span className="inline-flex items-center gap-1"><LivePulse className="h-2 w-2" />{t.labels.live}</span>}
              />
            ) : (
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">{t.labels.vs}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <ModalShell
      titleId="stadium-modal-title"
      title={stadium.stadium}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* Left column: Details */}
          <div>
            {/* Stadium details */}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-[var(--text-soft)]">{t.labels.stadiumLocation}</dt>
              <dd className="text-[var(--text-strong)]">{stadium.city}, {stadium.country}</dd>

              <dt className="text-[var(--text-soft)]">{t.labels.stadiumSeatCapacity}</dt>
              <dd className="text-[var(--text-strong)]">{seatCapacityLabel}</dd>

              <dt className="text-[var(--text-soft)]">{t.labels.opened}</dt>
              <dd className="text-[var(--text-strong)]">{openedYearLabel}</dd>

              <dt className="text-[var(--text-soft)]">{t.labels.stadiumTimeZone}</dt>
              <dd className="text-[var(--text-strong)]">{stadium.timeZone || t.labels.unknown}</dd>

              <dt className="text-[var(--text-soft)]">{t.labels.matchesHosted}</dt>
              <dd className="text-[var(--text-strong)]">{numberFormatter.format(stadium.matchesHosted)}</dd>

              <dt className="text-[var(--text-soft)]">{t.labels.firstKickoff}</dt>
              <dd className="text-[var(--text-strong)]">{firstKickoffLabel}</dd>

              <dt className="text-[var(--text-soft)]">{t.labels.lastKickoff}</dt>
              <dd className="text-[var(--text-strong)]">{lastKickoffLabel}</dd>
            </dl>
          </div>

          {/* Right column: Map preview (visible on larger screens) */}
          <div className="hidden border border-[var(--border)] bg-[var(--surface)] lg:block lg:min-h-0">
            <div className="relative h-full w-full">
              <svg
                viewBox={`${mapViewport.x} ${mapViewport.y} ${mapViewport.width} ${mapViewport.height}`}
                className="block h-full w-full bg-[var(--surface-soft)]"
                role="img"
                aria-label={t.labels.stadiumLocation}
                preserveAspectRatio="xMidYMid slice"
              >
                <g stroke="var(--border-strong)" opacity="0.18" strokeWidth="0.22">
                  {Array.from({ length: Math.floor(mapViewport.width / 12) + 1 }, (_, index) => (
                    <path
                      key={`meridian-${index}`}
                      d={getMeridianPath(mapViewport.x + index * 12)}
                      fill="none"
                    />
                  ))}
                  {Array.from({ length: Math.floor(mapViewport.height / 12) + 1 }, (_, index) => (
                    <path
                      key={`parallel-${index}`}
                      d={getParallelPath(mapViewport.y + index * 12)}
                      fill="none"
                    />
                  ))}
                </g>
                <image href={mapImageHref} x="0" y="0" width={WORLD_MAP_WIDTH} height={WORLD_MAP_HEIGHT} opacity={1} />
                {mapMarkers.map((marker) => (
                  <g
                    key={marker.key}
                    transform={`translate(${marker.x}, ${marker.y})`}
                  >
                    <circle r="1.2" fill="rgb(96 165 250 / 0.28)" />
                    <circle
                      r="0.62"
                      fill="rgb(37 99 235 / 0.98)"
                      stroke="rgb(219 234 254)"
                      strokeWidth="0.25"
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {stadiumMatches.length > 0 ? (
          <ModalMatchSections
            sections={[
              {
                key: 'live',
                title: t.labels.liveMatchesSection,
                items: liveMatches,
                renderItem: renderMatchRow,
                tone: 'live',
                titlePrefix: <LivePulse className="h-2.5 w-2.5" />,
              },
              {
                key: 'upcoming',
                title: t.labels.upcomingMatchesSection,
                items: upcomingMatches,
                renderItem: renderMatchRow,
              },
              {
                key: 'past',
                title: t.labels.pastMatchesSection,
                items: pastMatches,
                renderItem: renderMatchRow,
                alwaysRender: true,
                emptyMessage: t.labels.noLatestResults,
              },
            ]}
          />
        ) : null}

        {/* Mobile map preview (visible on smaller screens) */}
        <div className="border border-[var(--border)] bg-[var(--surface)] lg:hidden">
          <div className="relative h-48 w-full">
            <svg
              viewBox={`${mapViewport.x} ${mapViewport.y} ${mapViewport.width} ${mapViewport.height}`}
              className="block h-full w-full bg-[var(--surface-soft)]"
              role="img"
              aria-label={t.labels.stadiumLocation}
            >
              <g stroke="var(--border-strong)" opacity="0.18" strokeWidth="0.22">
                {Array.from({ length: Math.floor(mapViewport.width / 12) + 1 }, (_, index) => (
                  <path
                    key={`meridian-${index}`}
                    d={getMeridianPath(mapViewport.x + index * 12)}
                    fill="none"
                  />
                ))}
                {Array.from({ length: Math.floor(mapViewport.height / 12) + 1 }, (_, index) => (
                  <path
                    key={`parallel-${index}`}
                    d={getParallelPath(mapViewport.y + index * 12)}
                    fill="none"
                  />
                ))}
              </g>
              <image href={mapImageHref} x="0" y="0" width={WORLD_MAP_WIDTH} height={WORLD_MAP_HEIGHT} opacity={1} />
              {mapMarkers.map((marker) => (
                <g
                  key={marker.key}
                  transform={`translate(${marker.x}, ${marker.y})`}
                >
                  <circle r="1.2" fill="rgb(96 165 250 / 0.28)" />
                  <circle
                    r="0.62"
                    fill="rgb(37 99 235 / 0.98)"
                    stroke="rgb(219 234 254)"
                    strokeWidth="0.25"
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}
