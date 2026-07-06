#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const stadiumKeys = [
  { key: "at&t stadium", country: "united states" },
  { key: "arrowhead stadium", country: "united states" },
  { key: "bc place", country: "canada" },
  { key: "bmo field", country: "canada" },
  { key: "estadio akron", country: "mexico" },
  { key: "estadio azteca", country: "mexico" },
  { key: "estadio bbva", country: "mexico" },
  { key: "gillette stadium", country: "united states" },
  { key: "hard rock stadium", country: "united states" },
  { key: "levi's stadium", country: "united states" },
  { key: "lincoln financial field", country: "united states" },
  { key: "lumen field", country: "united states" },
  { key: "mercedes-benz stadium", country: "united states" },
  { key: "metlife stadium", country: "united states" },
  { key: "nrg stadium", country: "united states" },
  { key: "sofi stadium", country: "united states" },
  { key: "allianz stadium", country: "italy" },
  { key: "aviva stadium", country: "ireland" },
  { key: "bluenergy stadium", country: "italy" },
  { key: "brisbane stadium", country: "australia" },
  { key: "cardiff city stadium", country: "wales" },
  { key: "eden park", country: "new zealand" },
  { key: "emirates airline park", country: "south africa" },
  { key: "estadio mario alberto kempes", country: "argentina" },
  { key: "estadio del bicentenario", country: "argentina" },
  { key: "estadio único madre de ciudades", country: "argentina" },
  { key: "groupama stadium", country: "france" },
  { key: "hbf park", country: "australia" },
  { key: "hill dickinson stadium", country: "england" },
  { key: "hollywoodbets kings park", country: "south africa" },
  { key: "loftus versfeld", country: "south africa" },
  { key: "murrayfield", country: "scotland" },
  { key: "national olympic stadium", country: "japan" },
  { key: "newcastle stadium", country: "australia" },
  { key: "one new zealand stadium", country: "new zealand" },
  { key: "principality stadium", country: "wales" },
  { key: "prince chichibu memorial stadium", country: "japan" },
  { key: "sky stadium", country: "new zealand" },
  { key: "stade de france", country: "france" },
  { key: "stade pierre-mauroy", country: "france" },
  { key: "stadio luigi ferraris", country: "italy" },
  { key: "stadio olimpico", country: "italy" },
  { key: "sydney football stadium", country: "australia" },
]

const svgStadiums = [
  'at&t stadium', 'arrowhead stadium', 'bc place', 'bmo field', 'estadio azteca',
  'gillette stadium', 'hard rock stadium', "levi's stadium", 'lumen field', 
  'mercedes-benz stadium', 'metlife stadium', 'nrg stadium', 'sofi stadium',
  'lincoln financial field', 'stade de france', 'murrayfield', 'principality stadium',
  'eden park', 'stadio olimpico', 'aviva stadium'
]

let mappingLines = 'export const STADIUM_IMAGE_MAP: Readonly<Record<string, string | null>> = {\n'
for (const s of stadiumKeys) {
  const key = s.key + '|' + s.country
  let value = 'null'
  
  if (svgStadiums.includes(s.key)) {
    const filename = s.key.replace(/[&']/g, '').replace(/\s+/g, '-') + '.svg'
    value = "'/assets/stadiums/" + filename + "'"
  }
  
  mappingLines += "  '" + key + "': " + value + ',\n'
}
mappingLines += '}\n'

const mappingContent = `// Auto-generated stadium image mappings

import type { StadiumSummary } from './stadiums'

${mappingLines}

// Generate a deterministic color from stadium key for gradient backgrounds
function hashStadiumKeyToColor(stadiumKey: string): [string, string] {
  let hash = 0
  for (let i = 0; i < stadiumKey.length; i++) {
    const char = stadiumKey.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  const hue1 = Math.abs(hash) % 360
  const hue2 = (hue1 + 120) % 360
  const saturation = 60 + Math.abs(hash % 20)
  const lightness = 45 + Math.abs(hash % 15)

  return [
    \`hsl(\${hue1}, \${saturation}%, \${lightness}%)\`,
    \`hsl(\${hue2}, \${saturation}%, \${lightness + 10}%)\`,
  ]
}

export const getStadiumImageUrl = (stadiumKey: string): string | null => {
  return STADIUM_IMAGE_MAP[stadiumKey] ?? null
}

export const getStadiumBackgroundGradient = (stadiumKey: string): string => {
  const existing = STADIUM_IMAGE_MAP[stadiumKey]
  if (existing) {
    return \`url('\${existing}')\`
  }

  const [color1, color2] = hashStadiumKeyToColor(stadiumKey)
  return \`linear-gradient(135deg, \${color1} 0%, \${color2} 100%)\`
}

export const getStadiumBackgroundStyle = (
  stadium: Pick<StadiumSummary, 'key'>,
): { backgroundImage?: string } => {
  const imageUrl = getStadiumImageUrl(stadium.key)
  if (imageUrl) {
    return { backgroundImage: \`url('\${imageUrl}')\` }
  }
  return { backgroundImage: getStadiumBackgroundGradient(stadium.key) }
}
`

const mappingPath = path.join(__dirname, '../src/lib/stadium-images.ts')
fs.writeFileSync(mappingPath, mappingContent)

console.log('✨ Updated mapping with 20 stadium SVG images')
