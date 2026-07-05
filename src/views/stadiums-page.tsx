import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useLocale } from '../contexts/locale-context'
import { useTheme } from '../contexts/theme-context'
import { useTournament } from '../contexts/tournament-context'
import { formatMatchDate } from '../lib/format'
import { Icon } from '../lib/icons'
import { buildStadiumNavigationState, getStadiumListScrollTopFromState } from '../lib/stadiums-navigation-state'
import {
  buildStadiumSlugIndex,
  buildStadiumMapMarkers,
  buildStadiumSummaries,
  getStadiumMapViewport,
  normalizeStadiumSlug,
  type StadiumMapViewport,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
} from '../lib/stadiums'
import { StadiumTooltip } from '../components/stadiums/stadium-tooltip'
import { StadiumModal } from '../components/stadiums/stadium-modal'

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
  tooltipPosition: 'left' | 'right',
  mapContainerWidth: number,
): StadiumMapViewport => {
  const width = clamp(viewport.width * SELECTED_STADIUM_ZOOM_FACTOR, 26, WORLD_MAP_WIDTH)
  const height = clamp(viewport.height * SELECTED_STADIUM_ZOOM_FACTOR, 13, WORLD_MAP_HEIGHT)

  const tooltipWidth = mapContainerWidth > 640 ? 320 + 12 : 0
  let centerScreenRatio = 0.5
  if (tooltipWidth > 0) {
    if (tooltipPosition === 'right') {
      centerScreenRatio = (mapContainerWidth - tooltipWidth) / (2 * mapContainerWidth)
    } else {
      centerScreenRatio = (mapContainerWidth + tooltipWidth) / (2 * mapContainerWidth)
    }
  }

  const x = clamp(marker.x - centerScreenRatio * width, 0, WORLD_MAP_WIDTH - width)
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
  const navigate = useNavigate()
  const location = useLocation()
  const { stadiumSlug } = useParams<{ stadiumSlug?: string }>()
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list')
  const [hoveredStadiumKey, setHoveredStadiumKey] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<'left' | 'right'>('right')
  const [mapSvgContainerDimensions, setMapSvgContainerDimensions] = useState({ width: 0, height: 0 })
  const stadiumGridRef = useRef<HTMLDivElement | null>(null)
  const mapSvgContainerRef = useRef<HTMLDivElement | null>(null)
  const [gridScrollShadow, setGridScrollShadow] = useState({ showTop: false, showBottom: false })

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-US'),
    [locale],
  )
  const stadiums = useMemo(() => buildStadiumSummaries(matches), [matches])
  const { keyToSlug, slugToKey } = useMemo(
    () => buildStadiumSlugIndex(stadiums),
    [stadiums],
  )
  const selectedStadiumKeyFromPath = useMemo(() => {
    if (!stadiumSlug) {
      return null
    }

    return slugToKey[normalizeStadiumSlug(stadiumSlug)] ?? null
  }, [slugToKey, stadiumSlug])
  const selectedStadiumKey = selectedStadiumKeyFromPath
  const selectedStadium = selectedStadiumKey
    ? (stadiums.find((s) => s.key === selectedStadiumKey) ?? null)
    : null

  const mapMarkers = useMemo(() => buildStadiumMapMarkers(stadiums), [stadiums])
  const mapViewport = useMemo(() => {
    if (!selectedStadiumKey) {
      return getStadiumMapViewport(mapMarkers)
    }

    const selectedMarker = mapMarkers.find((marker) => marker.key === selectedStadiumKey)
    if (!selectedMarker) {
      return getStadiumMapViewport(mapMarkers)
    }

    const mapContainerWidth = mapSvgContainerDimensions.width || WORLD_MAP_WIDTH
    return focusViewportOnMarker(
      getStadiumMapViewport([selectedMarker]),
      selectedMarker,
      tooltipPosition,
      mapContainerWidth,
    )
  }, [mapMarkers, selectedStadiumKey, tooltipPosition, mapSvgContainerDimensions.width])

  const [animatedMapViewport, setAnimatedMapViewport] = useState<StadiumMapViewport>(mapViewport)
  const animatedMapViewportRef = useRef<StadiumMapViewport>(mapViewport)

  const updateListScrollShadow = useCallback(() => {
    const gridElement = stadiumGridRef.current
    if (!gridElement) {
      setGridScrollShadow({ showTop: false, showBottom: false })
      return
    }

    const hasOverflow = gridElement.scrollHeight - gridElement.clientHeight > 1
    if (!hasOverflow) {
      setGridScrollShadow({ showTop: false, showBottom: false })
      return
    }

    const showTop = gridElement.scrollTop > 1
    const showBottom = gridElement.scrollTop + gridElement.clientHeight < gridElement.scrollHeight - 1
    setGridScrollShadow({ showTop, showBottom })
  }, [])

  const setSelectedStadiumByKey = useCallback((nextStadiumKey: string | null) => {
    const stadiumSlugFromKey = nextStadiumKey ? keyToSlug[nextStadiumKey] : null
    const targetPathname = stadiumSlugFromKey ? `/stadiums/stadium/${encodeURIComponent(stadiumSlugFromKey)}` : '/stadiums'
    const targetUrl = `${targetPathname}${location.search}`
    const currentUrl = `${location.pathname}${location.search}`

    if (targetUrl === currentUrl) {
      return
    }

    const listScrollTop = stadiumGridRef.current?.scrollTop ?? 0
    navigate(targetUrl, {
      replace: true,
      preventScrollReset: true,
      state: buildStadiumNavigationState(location.state, listScrollTop),
    })
  }, [keyToSlug, location.pathname, location.search, location.state, navigate])

  const handleMarkerClick = useCallback((markerKey: string) => {
    const marker = mapMarkers.find((m) => m.key === markerKey)
    if (!marker) return

    setTooltipPosition(marker.x < WORLD_MAP_WIDTH / 2 ? 'right' : 'left')
    setSelectedStadiumByKey(markerKey)
  }, [mapMarkers, setSelectedStadiumByKey])

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
    if (selectedStadiumKeyFromPath) {
      const canonicalSlug = keyToSlug[selectedStadiumKeyFromPath]
      const encodedPathSlug = encodeURIComponent(canonicalSlug)
      const currentPathSlug = stadiumSlug ? encodeURIComponent(stadiumSlug) : null

      if (currentPathSlug !== encodedPathSlug) {
        navigate(`/stadiums/stadium/${encodedPathSlug}${location.search}`, {
          replace: true,
          preventScrollReset: true,
          state: location.state,
        })
        return
      }
    } else if (stadiumSlug) {
      navigate(`/stadiums${location.search}`, {
        replace: true,
        preventScrollReset: true,
        state: location.state,
      })
      return
    }

  }, [keyToSlug, location.search, location.state, navigate, selectedStadiumKeyFromPath, stadiumSlug])

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

  useEffect(() => {
    if (viewMode !== 'list') {
      return
    }

    const listScrollTop = getStadiumListScrollTopFromState(location.state)
    if (listScrollTop === null) {
      return
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const gridElement = stadiumGridRef.current
      if (!gridElement) {
        return
      }

      gridElement.scrollTop = listScrollTop
      updateListScrollShadow()
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [location.pathname, location.search, location.state, updateListScrollShadow, viewMode])

  useEffect(() => {
    const mapSvgContainer = mapSvgContainerRef.current
    if (!mapSvgContainer) return

    const updateDimensions = () => {
      setMapSvgContainerDimensions({
        width: mapSvgContainer.clientWidth,
        height: mapSvgContainer.clientHeight,
      })
    }

    // Initial update
    updateDimensions()

    // Use ResizeObserver to track size changes
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(mapSvgContainer)

    return () => resizeObserver.disconnect()
  }, [])

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.stadiums}</h2>
        <div className="inline-flex h-10 shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-soft)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" role="group" aria-label={t.headings.stadiums}>
          {([
            { value: 'list' as const, label: t.labels.list, icon: 'list' },
            { value: 'map' as const, label: t.labels.map, icon: 'map' },
          ] as const).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setViewMode(item.value)}
              className={`inline-flex h-8 w-8 items-center justify-center px-0 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-muted)]/40 sm:w-auto sm:gap-1 sm:px-3 ${
                viewMode === item.value
                  ? 'border border-[var(--tab-active-border)] bg-[var(--tab-active-bg)] text-[var(--tab-active-text)]'
                  : 'border border-transparent text-[var(--text-muted)] hover:bg-[var(--tab-idle-hover-bg)] hover:text-[var(--text)]'
              }`}
              aria-pressed={viewMode === item.value}
              aria-label={item.label}
              title={item.label}
            >
              <Icon name={item.icon} className="text-[14px] sm:hidden" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
           ))}
        </div>
      </div>

      {stadiums.length === 0 ? (
        <div className="bg-[var(--surface)] px-6 py-6 text-center text-sm text-[var(--text-muted)]">
          {t.labels.noStadiumsForCompetition}
        </div>
      ) : viewMode === 'map' ? (
        <>
          {/* Map view */}
         <div
           className="relative min-h-0 flex-1 border border-[var(--border)] bg-[var(--surface)] flex flex-col"
         >
           <div ref={mapSvgContainerRef} className="relative flex-1 min-h-0">
             <svg
               viewBox={`${animatedMapViewport.x} ${animatedMapViewport.y} ${animatedMapViewport.width} ${animatedMapViewport.height}`}
               className="block h-full w-full bg-[var(--surface-soft)]"
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
                 const isHovered = hoveredStadiumKey === marker.key
                 const isOtherSelected = selectedStadiumKey !== null && !isActive

                 return (
                   <g
                     key={marker.key}
                     transform={`translate(${marker.x}, ${marker.y})`}
                     className="cursor-pointer"
                     onClick={() => handleMarkerClick(marker.key)}
                     onMouseEnter={() => setHoveredStadiumKey(marker.key)}
                     onMouseLeave={() => setHoveredStadiumKey(null)}
                     opacity={isOtherSelected ? 0.3 : 1}
                     style={{ transition: 'opacity 200ms ease-out' }}
                   >
                     <title>{`${marker.stadium} · ${marker.city}, ${marker.country}`}</title>
                     <circle r="1.2" fill={isActive || isHovered ? 'rgb(96 165 250 / 0.28)' : 'rgb(59 130 246 / 0.2)'} />
                     <circle
                       r="0.62"
                       fill={isActive || isHovered ? 'rgb(37 99 235 / 0.98)' : 'rgb(30 64 175 / 0.95)'}
                       stroke="rgb(219 234 254)"
                       strokeWidth="0.25"
                     />
                   </g>
                 )
               })}
             </svg>
             {/* Stadium detail tooltip in map view (positioned within SVG container) */}
             {selectedStadium && (() => {
               const selectedMarker = mapMarkers.find((m) => m.key === selectedStadiumKey)
               return (
                 <StadiumTooltip
                   stadium={selectedStadium}
                   position={tooltipPosition}
                   onClose={() => setSelectedStadiumByKey(null)}
                   embedded
                   markerX={selectedMarker?.x}
                   markerY={selectedMarker?.y}
                   viewportX={animatedMapViewport.x}
                   viewportY={animatedMapViewport.y}
                   viewportWidth={animatedMapViewport.width}
                   viewportHeight={animatedMapViewport.height}
                   containerWidth={mapSvgContainerDimensions.width}
                   containerHeight={mapSvgContainerDimensions.height}
                 />
               )
             })()}
           </div>
           <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--text-soft)]">
             {t.labels.stadiumMapLegend}
           </p>
         </div>
        </>
      ) : (
        <>
          {/* List view */}
          <div className="relative min-h-0 flex-1">
            <div
              ref={stadiumGridRef}
              onScroll={updateListScrollShadow}
              className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 overflow-y-auto min-h-0 h-full content-start pr-1"
            >
              {stadiums.map((stadium) => {
              const firstKickoffLabel = formatMatchDate(stadium.firstKickoff, locale, stadium.timeZone || undefined, t.labels.today).localDateTime
              const lastKickoffLabel = formatMatchDate(stadium.lastKickoff, locale, stadium.timeZone || undefined, t.labels.today).localDateTime
              const seatCapacityLabel = stadium.seatCapacity
                ? `${numberFormatter.format(stadium.seatCapacity)} ${t.labels.seats}`
                : t.labels.unknown
              const openedYearLabel = stadium.openedYear ? String(stadium.openedYear) : t.labels.unknown

              return (
                <button
                  key={stadium.key}
                  type="button"
                  onClick={() => setSelectedStadiumByKey(stadium.key)}
                  className={`border bg-[var(--surface)] transition-colors text-left ${selectedStadiumKey === stadium.key ? 'border-[var(--accent-border)]' : 'border-[var(--border)] hover:bg-[var(--surface-strong)]'}`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-[var(--text-strong)]">{stadium.stadium}</h3>
                      <p className="truncate text-xs text-[var(--text-soft)]">{stadium.city}, {stadium.country}</p>
                    </div>
                    <Icon name="stadium" className="shrink-0 text-[18px] text-[var(--accent-text)]" />
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
                </button>
              )
            })}
          </div>
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[var(--bg)] to-transparent transition-opacity duration-200 ${gridScrollShadow.showTop ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[var(--bg)] to-transparent transition-opacity duration-200 ${gridScrollShadow.showBottom ? 'opacity-100' : 'opacity-0'}`}
          />
          </div>

          {/* Stadium detail modal in list view */}
          <StadiumModal stadium={selectedStadium} onClose={() => setSelectedStadiumByKey(null)} />
        </>
      )}
    </section>
  )
}
