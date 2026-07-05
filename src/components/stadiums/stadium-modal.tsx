import { useMemo } from 'react'
import { useLocale } from '../../contexts/locale-context'
import { useTheme } from '../../contexts/theme-context'
import { formatMatchDate } from '../../lib/format'
import { Icon } from '../../lib/icons'
import {
  buildStadiumMapMarkers,
  getStadiumMapViewport,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
} from '../../lib/stadiums'
import type { StadiumSummary } from '../../lib/stadiums'
import { ModalShell } from '../ui/modal-shell'

interface StadiumModalProps {
  stadium: StadiumSummary | null
  onClose: () => void
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

  return (
    <ModalShell
      titleId="stadium-modal-title"
      title={stadium.stadium}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left column: Details */}
        <div className="space-y-5">
          {/* Stadium header */}
          <div>
            <h4 className="text-xl font-bold text-[var(--text-strong)] sm:text-2xl">{stadium.stadium}</h4>
            <p className="mt-0.5 text-sm text-[var(--text-soft)]">
              {stadium.city}, {stadium.country}
            </p>
          </div>

          {/* Stadium details */}
          <div className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
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
    </ModalShell>
  )
}
