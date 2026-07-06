// Auto-generated stadium image mappings

import type { StadiumSummary } from './stadiums'

export const STADIUM_IMAGE_MAP: Readonly<Record<string, string | null>> = {
  'at&t stadium|united states': null,
  'arrowhead stadium|united states': null,
  'bc place|canada': null,
  'bmo field|canada': null,
  'estadio akron|mexico': null,
  'estadio azteca|mexico': null,
  'estadio bbva|mexico': null,
  'gillette stadium|united states': null,
  'hard rock stadium|united states': null,
  'levi\'s stadium|united states': null,
  'lincoln financial field|united states': null,
  'lumen field|united states': null,
  'mercedes-benz stadium|united states': null,
  'metlife stadium|united states': null,
  'nrg stadium|united states': null,
  'sofi stadium|united states': null,
  'allianz stadium|italy': null,
  'aviva stadium|ireland': null,
  'bluenergy stadium|italy': null,
  'brisbane stadium|australia': null,
  'cardiff city stadium|wales': null,
  'eden park|new zealand': null,
  'emirates airline park|south africa': null,
  'estadio mario alberto kempes|argentina': null,
  'estadio del bicentenario|argentina': null,
  'estadio único madre de ciudades|argentina': null,
  'groupama stadium|france': null,
  'hbf park|australia': null,
  'hill dickinson stadium|england': null,
  'hollywoodbets kings park|south africa': null,
  'loftus versfeld|south africa': null,
  'murrayfield|scotland': null,
  'national olympic stadium|japan': null,
  'newcastle stadium|australia': null,
  'one new zealand stadium|new zealand': null,
  'principality stadium|wales': null,
  'prince chichibu memorial stadium|japan': null,
  'sky stadium|new zealand': null,
  'stade de france|france': null,
  'stade pierre-mauroy|france': null,
  'stadio luigi ferraris|italy': null,
  'stadio olimpico|italy': null,
  'sydney football stadium|australia': null,
}


// Generate a sober gradient using theme colors based on stadium key
function hashStadiumKeyToColor(stadiumKey: string): [string, string] {
  let hash = 0
  for (let i = 0; i < stadiumKey.length; i++) {
    const char = stadiumKey.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  // Color palette using theme colors: mix of surface and accent colors with subtle opacity
  const colors = [
    'rgba(0, 217, 143, 0.12)',
    'rgba(40, 127, 207, 0.12)',
    'rgba(130, 170, 225, 0.10)',
    'rgba(154, 204, 255, 0.10)',
    'rgba(0, 217, 143, 0.13)',
    'rgba(40, 127, 207, 0.11)',
  ]

  const index = Math.abs(hash) % colors.length
  const secondIndex = (index + 1) % colors.length

  return [colors[index], colors[secondIndex]]
}

export const getStadiumImageUrl = (stadiumKey: string): string | null => {
  return STADIUM_IMAGE_MAP[stadiumKey] ?? null
}

export const getStadiumBackgroundGradient = (stadiumKey: string): string => {
  const existing = STADIUM_IMAGE_MAP[stadiumKey]
  if (existing) {
    return `url('${existing}')`
  }

  const [color1, color2] = hashStadiumKeyToColor(stadiumKey)
  return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`
}

// Get gradient colors for use in fade overlays
export const getGradientColors = (key: string): [string, string] => {
  return hashStadiumKeyToColor(key)
}

// Get gradient with fade-out effect for widget headers
export const getGradientWithFadeOut = (key: string): string => {
  const [color1, color2] = hashStadiumKeyToColor(key)
  // Create a vertical gradient that blends from the diagonal gradient colors to transparent
  return `linear-gradient(180deg, ${color1} 0%, ${color2} 50%, rgba(255, 255, 255, 0) 100%)`
}

export const getStadiumBackgroundStyle = (
  stadium: Pick<StadiumSummary, 'key'>,
): { backgroundImage?: string } => {
  const imageUrl = getStadiumImageUrl(stadium.key)
  if (imageUrl) {
    return { backgroundImage: `url('${imageUrl}')` }
  }
  return { backgroundImage: getStadiumBackgroundGradient(stadium.key) }
}
