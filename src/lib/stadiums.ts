import type { MatchRecord } from '../types/tournament'

type StadiumCatalogRecord = {
  seatCapacity: number
  openedYear: number
  latitude: number
  longitude: number
}

const STADIUM_CATALOG: Readonly<Record<string, StadiumCatalogRecord>> = {
  'at&t stadium': { seatCapacity: 80_000, openedYear: 2009, latitude: 32.7473, longitude: -97.0945 },
  'arrowhead stadium': { seatCapacity: 76_416, openedYear: 1972, latitude: 39.0489, longitude: -94.4849 },
  'bc place': { seatCapacity: 54_500, openedYear: 1983, latitude: 49.2776, longitude: -123.1119 },
  'bmo field': { seatCapacity: 45_000, openedYear: 2007, latitude: 43.6332, longitude: -79.4186 },
  'estadio akron': { seatCapacity: 49_850, openedYear: 2010, latitude: 20.6829, longitude: -103.4623 },
  'estadio azteca': { seatCapacity: 87_523, openedYear: 1966, latitude: 19.3029, longitude: -99.1505 },
  'estadio bbva': { seatCapacity: 53_500, openedYear: 2015, latitude: 25.6698, longitude: -100.2441 },
  'gillette stadium': { seatCapacity: 65_878, openedYear: 2002, latitude: 42.0909, longitude: -71.2643 },
  'hard rock stadium': { seatCapacity: 65_326, openedYear: 1987, latitude: 25.958, longitude: -80.2389 },
  "levi's stadium": { seatCapacity: 68_500, openedYear: 2014, latitude: 37.403, longitude: -121.97 },
  'lincoln financial field': { seatCapacity: 67_594, openedYear: 2003, latitude: 39.9008, longitude: -75.1675 },
  'lumen field': { seatCapacity: 68_740, openedYear: 2002, latitude: 47.5952, longitude: -122.3316 },
  'mercedes-benz stadium': { seatCapacity: 71_000, openedYear: 2017, latitude: 33.7554, longitude: -84.4008 },
  'metlife stadium': { seatCapacity: 82_500, openedYear: 2010, latitude: 40.8135, longitude: -74.0745 },
  'nrg stadium': { seatCapacity: 72_220, openedYear: 2002, latitude: 29.6847, longitude: -95.4107 },
  'sofi stadium': { seatCapacity: 70_240, openedYear: 2020, latitude: 33.9535, longitude: -118.3392 },
}

const COUNTRY_CENTROIDS: Readonly<Record<string, { latitude: number; longitude: number }>> = {
  argentina: { latitude: -38.4161, longitude: -63.6167 },
  australia: { latitude: -25.2744, longitude: 133.7751 },
  canada: { latitude: 56.1304, longitude: -106.3468 },
  england: { latitude: 52.3555, longitude: -1.1743 },
  france: { latitude: 46.2276, longitude: 2.2137 },
  ireland: { latitude: 53.1424, longitude: -7.6921 },
  italy: { latitude: 41.8719, longitude: 12.5674 },
  japan: { latitude: 36.2048, longitude: 138.2529 },
  mexico: { latitude: 23.6345, longitude: -102.5528 },
  'new zealand': { latitude: -40.9006, longitude: 174.886 },
  scotland: { latitude: 56.4907, longitude: -4.2026 },
  'south africa': { latitude: -30.5595, longitude: 22.9375 },
  'united states': { latitude: 39.8283, longitude: -98.5795 },
  wales: { latitude: 52.1307, longitude: -3.7837 },
}

export type StadiumSummary = {
  key: string
  stadium: string
  city: string
  country: string
  timeZone: string
  seatCapacity: number | null
  openedYear: number | null
  matchesHosted: number
  firstKickoff: string
  lastKickoff: string
}

export type StadiumMapMarker = {
  key: string
  stadium: string
  city: string
  country: string
  matchesHosted: number
  x: number
  y: number
}

const normalizeVenueText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')
export const WORLD_MAP_WIDTH = 360
export const WORLD_MAP_HEIGHT = 180
const MAP_MIN_LONGITUDE = -180
const MAP_MAX_LONGITUDE = 180
const MAP_MIN_LATITUDE = -85
const MAP_MAX_LATITUDE = 85
const MIN_ZOOM_VIEWPORT_WIDTH = 86
const MIN_ZOOM_VIEWPORT_HEIGHT = 43
const VIEWPORT_PADDING = 10

const pickMostCommonValue = (values: Map<string, number>) => {
  let selectedValue = ''
  let selectedCount = 0

  for (const [value, count] of values.entries()) {
    if (count > selectedCount || (count === selectedCount && value.localeCompare(selectedValue) < 0)) {
      selectedValue = value
      selectedCount = count
    }
  }

  return selectedValue
}

export const getStadiumCatalogRecord = (stadiumName: string) => {
  return STADIUM_CATALOG[normalizeVenueText(stadiumName)]
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const projectLongitudeToMapX = (longitude: number) => {
  const normalized = (longitude - MAP_MIN_LONGITUDE) / (MAP_MAX_LONGITUDE - MAP_MIN_LONGITUDE)
  return clamp(normalized, 0, 1) * WORLD_MAP_WIDTH
}

const projectLatitudeToMapY = (latitude: number) => {
  const normalized = (latitude - MAP_MIN_LATITUDE) / (MAP_MAX_LATITUDE - MAP_MIN_LATITUDE)
  return WORLD_MAP_HEIGHT - clamp(normalized, 0, 1) * WORLD_MAP_HEIGHT
}

const getCountryCentroid = (country: string) => COUNTRY_CENTROIDS[normalizeVenueText(country)]

const getStadiumCoordinates = (stadiumName: string, country: string) => {
  const stadiumRecord = getStadiumCatalogRecord(stadiumName)
  if (stadiumRecord) {
    return {
      latitude: stadiumRecord.latitude,
      longitude: stadiumRecord.longitude,
    }
  }

  return getCountryCentroid(country) ?? null
}

export const buildStadiumSummaries = (matches: readonly MatchRecord[]): StadiumSummary[] => {
  const stadiumByKey = new Map<string, StadiumSummary & { cityCounts: Map<string, number>; timeZoneCounts: Map<string, number> }>()

  for (const match of matches) {
    const stadium = match.venue.stadium.trim()
    if (!stadium) {
      continue
    }

    const country = match.venue.country.trim()
    const key = `${normalizeVenueText(stadium)}|${normalizeVenueText(country)}`
    const catalogRecord = getStadiumCatalogRecord(stadium)
    const city = match.venue.city.trim()
    const timeZone = match.venue.timeZone.trim()
    const existing = stadiumByKey.get(key)

    if (!existing) {
      const cityCounts = new Map<string, number>()
      if (city) {
        cityCounts.set(city, 1)
      }
      const timeZoneCounts = new Map<string, number>()
      if (timeZone) {
        timeZoneCounts.set(timeZone, 1)
      }

      stadiumByKey.set(key, {
        key,
        stadium,
        city,
        country,
        timeZone,
        seatCapacity: catalogRecord?.seatCapacity ?? null,
        openedYear: catalogRecord?.openedYear ?? null,
        matchesHosted: 1,
        firstKickoff: match.kickoff,
        lastKickoff: match.kickoff,
        cityCounts,
        timeZoneCounts,
      })
      continue
    }

    existing.matchesHosted += 1
    if (match.kickoff < existing.firstKickoff) {
      existing.firstKickoff = match.kickoff
    }
    if (match.kickoff > existing.lastKickoff) {
      existing.lastKickoff = match.kickoff
    }
    if (city) {
      existing.cityCounts.set(city, (existing.cityCounts.get(city) ?? 0) + 1)
    }
    if (timeZone) {
      existing.timeZoneCounts.set(timeZone, (existing.timeZoneCounts.get(timeZone) ?? 0) + 1)
    }
  }

  return [...stadiumByKey.values()]
    .map((stadium) => ({
      key: stadium.key,
      stadium: stadium.stadium,
      country: stadium.country,
      city: pickMostCommonValue(stadium.cityCounts),
      timeZone: pickMostCommonValue(stadium.timeZoneCounts),
      seatCapacity: stadium.seatCapacity,
      openedYear: stadium.openedYear,
      matchesHosted: stadium.matchesHosted,
      firstKickoff: stadium.firstKickoff,
      lastKickoff: stadium.lastKickoff,
    }))
    .sort((first, second) =>
      first.country.localeCompare(second.country)
      || first.city.localeCompare(second.city)
      || first.stadium.localeCompare(second.stadium),
    )
}

export const buildStadiumMapMarkers = (stadiums: readonly StadiumSummary[]): StadiumMapMarker[] => {
  return stadiums
    .map((stadium) => {
      const coordinates = getStadiumCoordinates(stadium.stadium, stadium.country)
      if (!coordinates) {
        return null
      }

      return {
        key: stadium.key,
        stadium: stadium.stadium,
        city: stadium.city,
        country: stadium.country,
        matchesHosted: stadium.matchesHosted,
        x: projectLongitudeToMapX(coordinates.longitude),
        y: projectLatitudeToMapY(coordinates.latitude),
      }
    })
    .filter((marker): marker is StadiumMapMarker => Boolean(marker))
}

export type StadiumMapViewport = {
  x: number
  y: number
  width: number
  height: number
}

const fitViewportToWorld = (viewport: StadiumMapViewport): StadiumMapViewport => {
  const width = clamp(viewport.width, MIN_ZOOM_VIEWPORT_WIDTH, WORLD_MAP_WIDTH)
  const height = clamp(viewport.height, MIN_ZOOM_VIEWPORT_HEIGHT, WORLD_MAP_HEIGHT)
  const x = clamp(viewport.x, 0, WORLD_MAP_WIDTH - width)
  const y = clamp(viewport.y, 0, WORLD_MAP_HEIGHT - height)

  return { x, y, width, height }
}

export const getStadiumMapViewport = (markers: readonly StadiumMapMarker[]): StadiumMapViewport => {
  if (markers.length === 0) {
    return {
      x: 0,
      y: 0,
      width: WORLD_MAP_WIDTH,
      height: WORLD_MAP_HEIGHT,
    }
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const marker of markers) {
    minX = Math.min(minX, marker.x)
    maxX = Math.max(maxX, marker.x)
    minY = Math.min(minY, marker.y)
    maxY = Math.max(maxY, marker.y)
  }

  const spanX = maxX - minX
  const spanY = maxY - minY
  const desiredWidth = Math.max(spanX + VIEWPORT_PADDING * 2, MIN_ZOOM_VIEWPORT_WIDTH)
  const desiredHeight = Math.max(spanY + VIEWPORT_PADDING * 2, MIN_ZOOM_VIEWPORT_HEIGHT)
  const targetAspectRatio = WORLD_MAP_WIDTH / WORLD_MAP_HEIGHT

  let width = desiredWidth
  let height = desiredHeight

  if (width / height > targetAspectRatio) {
    height = width / targetAspectRatio
  } else {
    width = height * targetAspectRatio
  }

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return fitViewportToWorld({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  })
}
