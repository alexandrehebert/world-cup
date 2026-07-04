import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '../contexts/locale-context'
import { useTheme } from '../contexts/theme-context'
import { useTournament } from '../contexts/tournament-context'
import { formatMatchDate } from '../lib/format'
import { Icon } from '../lib/icons'
import {
  buildStadiumMapMarkers,
  buildStadiumSummaries,
  getStadiumMapViewport,
  type StadiumMapViewport,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
} from '../lib/stadiums'

const MAP_GRID_CELL_SIZE = 12
const MAP_GRID_MERIDIANS = Math.floor(WORLD_MAP_WIDTH / MAP_GRID_CELL_SIZE)
const MAP_GRID_PARALLELS = Math.floor(WORLD_MAP_HEIGHT / MAP_GRID_CELL_SIZE)
const MAP_GRID_MERIDIAN_WARP = 30
const MAP_GRID_PARALLEL_WARP = 20
const SELECTED_STADIUM_ZOOM_FACTOR = 0.6
const MAP_VIEWPORT_TRANSITION_DURATION_MS = 420

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const viewportEquals = (first: StadiumMapViewport, second: StadiumMapViewport) =>
  first.x === second.x
  && first.y === second.y
  && first.width === second.width
  && first.height === second.height

const lerp = (start: number, end: number, progress: number) => start + (end - start) * progress

const focusViewportOnMarker = (
  viewport: StadiumMapViewport,
  marker: { x: number; y: number },
): StadiumMapViewport => {
  const width = clamp(viewport.width * SELECTED_STADIUM_ZOOM_FACTOR, 26, WORLD_MAP_WIDTH)
  const height = clamp(viewport.height * SELECTED_STADIUM_ZOOM_FACTOR, 13, WORLD_MAP_HEIGHT)
  const x = clamp(marker.x - width / 2, 0, WORLD_MAP_WIDTH - width)
  const y = clamp(marker.y - height / 2, 0, WORLD_MAP_HEIGHT - height)

  return { x, y, width, height }
}

const getMeridianPath = (x: number) => {
  const horizontalRatio = (x - WORLD_MAP_WIDTH / 2) / (WORLD_MAP_WIDTH / 2)
  const offsetX = horizontalRatio * MAP_GRID_MERIDIAN_WARP
  return `M ${x} 0 Q ${x + offsetX} ${WORLD_MAP_HEIGHT / 2} ${x} ${WORLD_MAP_HEIGHT}`
}

const getParallelPath = (y: number) => {
  const verticalRatio = (y - WORLD_MAP_HEIGHT / 2) / (WORLD_MAP_HEIGHT / 2)
  const offsetY = verticalRatio * MAP_GRID_PARALLEL_WARP
  return `M 0 ${y} Q ${WORLD_MAP_WIDTH / 2} ${y + offsetY} ${WORLD_MAP_WIDTH} ${y}`
}

export const StadiumsPage = () => {
  const { locale, t } = useLocale()
  const { themePreference } = useTheme()
  const { matches } = useTournament()
  const [selectedStadiumKey, setSelectedStadiumKey] = useState<string | null>(null)
  const stadiumCardRefs = useRef<Record<string, HTMLElement | null>>({})
  const stadiumListRef = useRef<HTMLDivElement | null>(null)
  const [listScrollShadow, setListScrollShadow] = useState({ showTop: false, showBottom: false })

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-US'),
    [locale],
  )
  const stadiums = useMemo(() => buildStadiumSummaries(matches), [matches])
  const mapMarkers = useMemo(() => buildStadiumMapMarkers(stadiums), [stadiums])
  const mapViewport = useMemo(() => {
    if (!selectedStadiumKey) {
      return getStadiumMapViewport(mapMarkers)
    }

    const selectedMarker = mapMarkers.find((marker) => marker.key === selectedStadiumKey)
    if (!selectedMarker) {
      return getStadiumMapViewport(mapMarkers)
    }

    return focusViewportOnMarker(getStadiumMapViewport([selectedMarker]), selectedMarker)
  }, [mapMarkers, selectedStadiumKey])
  const [animatedMapViewport, setAnimatedMapViewport] = useState<StadiumMapViewport>(mapViewport)
  const animatedMapViewportRef = useRef<StadiumMapViewport>(mapViewport)
  const setStadiumCardRef = useCallback(
    (key: string) => (element: HTMLElement | null) => {
      stadiumCardRefs.current[key] = element
    },
    [],
  )
  const toggleStadiumSelection = useCallback((key: string, scrollToCard = false) => {
    setSelectedStadiumKey((currentKey) => {
      const nextKey = currentKey === key ? null : key
      if (nextKey && scrollToCard) {
        stadiumCardRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return nextKey
    })
  }, [])
  const updateListScrollShadow = useCallback(() => {
    const listElement = stadiumListRef.current
    if (!listElement) {
      setListScrollShadow({ showTop: false, showBottom: false })
      return
    }

    const hasOverflow = listElement.scrollHeight - listElement.clientHeight > 1
    if (!hasOverflow) {
      setListScrollShadow({ showTop: false, showBottom: false })
      return
    }

    const showTop = listElement.scrollTop > 1
    const showBottom = listElement.scrollTop + listElement.clientHeight < listElement.scrollHeight - 1
    setListScrollShadow({ showTop, showBottom })
  }, [])
  const mapImageHref = useMemo(() => {
    if (themePreference === 'light') {
      return '/assets/world-stadiums-map-light.svg'
    }

    if (themePreference === 'colorblind') {
      return '/assets/world-stadiums-map-colorblind.svg'
    }

    return '/assets/world-stadiums-map-dark.svg'
  }, [themePreference])

  useEffect(() => {
    if (viewportEquals(animatedMapViewportRef.current, mapViewport)) {
      return
    }

    let animationFrame = 0

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animationFrame = window.requestAnimationFrame(() => {
        animatedMapViewportRef.current = mapViewport
        setAnimatedMapViewport(mapViewport)
      })
      return () => window.cancelAnimationFrame(animationFrame)
    }

    const initialViewport = animatedMapViewportRef.current
    const animationStart = performance.now()
    const easeInOutCubic = (value: number) =>
      value < 0.5 ? 4 * value * value * value : 1 - ((-2 * value + 2) ** 3) / 2

    const animate = (timestamp: number) => {
      const elapsed = timestamp - animationStart
      const progress = clamp(elapsed / MAP_VIEWPORT_TRANSITION_DURATION_MS, 0, 1)
      const easedProgress = easeInOutCubic(progress)
      const nextViewport: StadiumMapViewport = {
        x: lerp(initialViewport.x, mapViewport.x, easedProgress),
        y: lerp(initialViewport.y, mapViewport.y, easedProgress),
        width: lerp(initialViewport.width, mapViewport.width, easedProgress),
        height: lerp(initialViewport.height, mapViewport.height, easedProgress),
      }
      animatedMapViewportRef.current = nextViewport
      setAnimatedMapViewport(nextViewport)

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate)
      }
    }

    animationFrame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [mapViewport])

  useEffect(() => {
    updateListScrollShadow()
    window.addEventListener('resize', updateListScrollShadow)
    return () => window.removeEventListener('resize', updateListScrollShadow)
  }, [stadiums.length, updateListScrollShadow])

  return (
    <section className="space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-3">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.stadiums}</h2>
      </div>

      {stadiums.length === 0 ? (
        <div className="bg-[var(--surface)] px-6 py-6 text-center text-sm text-[var(--text-muted)]">
          {t.labels.noStadiumsForCompetition}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(420px,58%)_minmax(0,1fr)]">
          <article className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] lg:flex lg:min-h-0 lg:flex-col">
            <div className="relative lg:min-h-0 lg:flex-1">
              <svg
                viewBox={`${animatedMapViewport.x} ${animatedMapViewport.y} ${animatedMapViewport.width} ${animatedMapViewport.height}`}
                className="block h-auto w-full bg-[var(--surface-soft)] lg:h-full"
                role="img"
                aria-label={t.labels.stadiumMap}
              >
                <g stroke="var(--border-strong)" opacity="0.18" strokeWidth="0.22">
                  {Array.from({ length: MAP_GRID_MERIDIANS + 1 }, (_, index) => (
                    <path
                      key={`meridian-${index}`}
                      d={getMeridianPath(index * MAP_GRID_CELL_SIZE)}
                      fill="none"
                    />
                  ))}
                  {Array.from({ length: MAP_GRID_PARALLELS + 1 }, (_, index) => (
                    <path
                      key={`parallel-${index}`}
                      d={getParallelPath(index * MAP_GRID_CELL_SIZE)}
                      fill="none"
                    />
                  ))}
                </g>
                <image href={mapImageHref} x="0" y="0" width={WORLD_MAP_WIDTH} height={WORLD_MAP_HEIGHT} opacity={1} />
                {mapMarkers.map((marker) => {
                  const isActive = selectedStadiumKey === marker.key

                  return (
                  <g
                    key={marker.key}
                    transform={`translate(${marker.x}, ${marker.y})`}
                    className="cursor-pointer"
                    onClick={() => toggleStadiumSelection(marker.key, true)}
                  >
                    <title>{`${marker.stadium} · ${marker.city}, ${marker.country}`}</title>
                    <circle r="1.2" fill={isActive ? 'rgb(96 165 250 / 0.28)' : 'rgb(59 130 246 / 0.2)'} />
                    <circle
                      r="0.62"
                      fill={isActive ? 'rgb(37 99 235 / 0.98)' : 'rgb(30 64 175 / 0.95)'}
                      stroke="rgb(219 234 254)"
                      strokeWidth="0.25"
                    />
                  </g>
                  )
                })}
              </svg>
            </div>
            <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--text-soft)]">
              {t.labels.stadiumMapLegend}
            </p>
          </article>

          <div className="relative lg:min-h-0">
            <div
              ref={stadiumListRef}
              onScroll={updateListScrollShadow}
              className="grid grid-cols-1 gap-3 lg:h-full lg:min-h-0 lg:content-start lg:overflow-y-auto lg:pr-1"
            >
              {stadiums.map((stadium) => {
                const isActive = selectedStadiumKey === stadium.key
                const firstKickoffLabel = formatMatchDate(stadium.firstKickoff, locale, stadium.timeZone || undefined, t.labels.today).localDateTime
                const lastKickoffLabel = formatMatchDate(stadium.lastKickoff, locale, stadium.timeZone || undefined, t.labels.today).localDateTime
                const seatCapacityLabel = stadium.seatCapacity
                  ? `${numberFormatter.format(stadium.seatCapacity)} ${t.labels.seats}`
                  : t.labels.unknown
                const openedYearLabel = stadium.openedYear ? String(stadium.openedYear) : t.labels.unknown

                return (
                  <article
                    key={stadium.key}
                    ref={setStadiumCardRef(stadium.key)}
                    className={`border bg-[var(--surface)] transition-colors ${isActive ? 'border-[var(--accent-border)]' : 'border-[var(--border)]'}`}
                    onClick={() => toggleStadiumSelection(stadium.key)}
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-[var(--text-strong)]">{stadium.stadium}</h3>
                        <p className="truncate text-xs text-[var(--text-soft)]">{stadium.city}, {stadium.country}</p>
                      </div>
                      <Icon name="stadium" className="text-[18px] text-[var(--accent-text)]" />
                    </div>

                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 px-4 py-3 text-sm">
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
                  </article>
                )
              })}
            </div>
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 hidden h-6 bg-gradient-to-b from-[var(--bg)] to-transparent transition-opacity duration-200 lg:block ${listScrollShadow.showTop ? 'opacity-100' : 'opacity-0'}`}
            />
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 hidden h-6 bg-gradient-to-t from-[var(--bg)] to-transparent transition-opacity duration-200 lg:block ${listScrollShadow.showBottom ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        </div>
      )}
    </section>
  )
}
