import { useEffect, useMemo, useRef } from 'react'
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

interface StadiumTooltipProps {
  stadium: StadiumSummary | null
  position: 'left' | 'right'
  onClose: () => void
  embedded?: boolean
  markerX?: number
  markerY?: number
  viewportX?: number
  viewportY?: number
  viewportWidth?: number
  viewportHeight?: number
  containerWidth?: number
  containerHeight?: number
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

export const StadiumTooltip = ({
  stadium,
  position,
  onClose,
  embedded = false,
  markerX,
  markerY,
  viewportX,
  viewportY,
  viewportWidth,
  viewportHeight,
  containerWidth,
  containerHeight,
}: StadiumTooltipProps) => {
  const { locale, t } = useLocale()
  const { themePreference } = useTheme()
  const backdropRef = useRef<HTMLDivElement>(null)

  // Calculate tooltip position based on marker location
  const getTooltipPosition = () => {
    const hasPositioningData = (
      markerX !== undefined
      && markerY !== undefined
      && viewportX !== undefined
      && viewportY !== undefined
      && viewportWidth !== undefined
      && viewportHeight !== undefined
      && containerWidth !== undefined
      && containerHeight !== undefined
      && viewportWidth > 0
      && viewportHeight > 0
      && containerWidth > 0
      && containerHeight > 0
    )

    if (!embedded || !hasPositioningData) {
      // Fallback to fixed position
      return {
        top: '50%',
        left: position === 'left' ? '1rem' : 'auto',
        right: position === 'right' ? '1rem' : 'auto',
        translateX: '0',
        translateY: '-50%',
      }
    }

    // Convert marker world coordinates to screen coordinates
    // screenX and screenY are in pixels relative to the visible SVG container
    const screenX = ((markerX - viewportX) / viewportWidth) * containerWidth
    const screenY = ((markerY - viewportY) / viewportHeight) * containerHeight

    const tooltipWidth = 320 // w-80 = 320px
    const tooltipHeight = 300 // approximate
    const gap = 12 // gap between marker and tooltip

    // Prefer the requested side first, then fall back to the opposite side.
    let left: number

    if (position === 'right') {
      left = screenX + gap
      if (left + tooltipWidth > containerWidth - gap) {
        left = Math.max(gap, screenX - tooltipWidth - gap)
      }
    } else {
      left = screenX - tooltipWidth - gap
      if (left < gap) {
        left = Math.min(containerWidth - tooltipWidth - gap, screenX + gap)
      }
    }

    // Ensure stays in bounds with gap
    left = Math.max(gap, Math.min(left, containerWidth - tooltipWidth - gap))

    // Vertically position
    let top = screenY - tooltipHeight / 2
    top = Math.max(gap, Math.min(top, containerHeight - tooltipHeight - gap))

    return {
      top: `${top}px`,
      left: `${left}px`,
      right: 'auto',
      translateX: '0',
      translateY: '0',
    }
  }

  const positionStyle = getTooltipPosition()


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

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

  if (embedded) {
    return (
      <>
        {/* Embedded tooltip (positioned near the selected marker) */}
        <div
          className="absolute z-20 w-80 flex flex-col h-auto max-h-[calc(100%-2rem)] border border-[var(--border-strong)] bg-[var(--surface-strong)] shadow-xl shadow-slate-950/30 transition-all duration-300 ease-out rounded-lg"
          style={{
            top: positionStyle.top,
            left: positionStyle.left,
            right: positionStyle.right,
            transform: `translate(${positionStyle.translateX}, ${positionStyle.translateY})`,
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/70 px-5 py-4 backdrop-blur rounded-t-lg">
            <h3 className="text-lg font-semibold text-[var(--text-strong)] truncate">
              {stadium.stadium}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text)] transition hover:text-[var(--text-strong)]"
              aria-label={t.labels.close}
            >
              <Icon name="close" className="text-[20px] leading-none" />
            </button>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
            {/* Stadium details */}
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-2 text-xs">
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
      </>
    )
  }

  // Non-embedded (full-page) drawer
  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-slate-950/30 transition-opacity duration-200 ease-out opacity-100"
        onClick={onClose}
        role="presentation"
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 z-50 w-full sm:w-96 flex flex-col ${position === 'left' ? 'left-0' : 'right-0'} border border-[var(--border-strong)] bg-[var(--surface-strong)] shadow-2xl shadow-slate-950/30 transition-transform duration-300 ease-out translate-x-0`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/70 px-5 py-4 backdrop-blur">
          <h3 className="text-lg font-semibold text-[var(--text-strong)] truncate">
            {stadium.stadium}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text)] transition hover:text-[var(--text-strong)]"
            aria-label={t.labels.close}
          >
            <Icon name="close" className="text-[20px] leading-none" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Stadium header */}
          <div>
            <h4 className="text-sm font-bold text-[var(--text-strong)]">{stadium.stadium}</h4>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">
              {stadium.city}, {stadium.country}
            </p>
          </div>

          {/* Stadium details */}
          <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
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

          {/* Map preview */}
          <div className="border border-[var(--border)] bg-[var(--surface)]">
            <div className="relative h-40 w-full">
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
      </div>
    </>
  )
}
