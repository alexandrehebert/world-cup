#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STADIUMS_DIR = path.join(__dirname, '../public/assets/stadiums')

// Ensure directory exists
if (!fs.existsSync(STADIUMS_DIR)) {
  fs.mkdirSync(STADIUMS_DIR, { recursive: true })
}

// Stadium information with search queries
const STADIUMS = [
  { key: "at&t stadium", name: "AT&T Stadium Arlington Texas" },
  { key: "arrowhead stadium", name: "Arrowhead Stadium Kansas City" },
  { key: "bc place", name: "BC Place Vancouver" },
  { key: "bmo field", name: "BMO Field Toronto" },
  { key: "estadio akron", name: "Estadio Akron Guadalajara" },
  { key: "estadio azteca", name: "Estadio Azteca Mexico City" },
  { key: "estadio bbva", name: "Estadio BBVA Monterrey" },
  { key: "gillette stadium", name: "Gillette Stadium New England" },
  { key: "hard rock stadium", name: "Hard Rock Stadium Miami" },
  { key: "levi's stadium", name: "Levis Stadium San Francisco" },
  { key: "lincoln financial field", name: "Lincoln Financial Field Philadelphia" },
  { key: "lumen field", name: "Lumen Field Seattle" },
  { key: "mercedes-benz stadium", name: "Mercedes-Benz Stadium Atlanta" },
  { key: "metlife stadium", name: "MetLife Stadium New York" },
  { key: "nrg stadium", name: "NRG Stadium Houston" },
  { key: "sofi stadium", name: "SoFi Stadium Los Angeles" },
  { key: "allianz stadium", name: "Allianz Stadium Turin" },
  { key: "aviva stadium", name: "Aviva Stadium Dublin" },
  { key: "bluenergy stadium", name: "Stadio Friuli Udine" },
  { key: "brisbane stadium", name: "Brisbane Stadium" },
  { key: "cardiff city stadium", name: "Cardiff City Stadium" },
  { key: "eden park", name: "Eden Park Auckland" },
  { key: "emirates airline park", name: "Emirates Airline Park" },
  { key: "estadio mario alberto kempes", name: "Estadio Mario Kempes Cordoba" },
  { key: "estadio del bicentenario", name: "Estadio Bicentenario San Juan" },
  { key: "estadio único madre de ciudades", name: "Estadio Madre de Ciudades" },
  { key: "groupama stadium", name: "Groupama Stadium Lyon" },
  { key: "hbf park", name: "HBF Park Perth" },
  { key: "hill dickinson stadium", name: "DW Stadium Wigan" },
  { key: "hollywoodbets kings park", name: "Kings Park Durban" },
  { key: "loftus versfeld", name: "Loftus Versfeld Pretoria" },
  { key: "murrayfield", name: "Murrayfield Edinburgh" },
  { key: "national olympic stadium", name: "National Stadium Tokyo" },
  { key: "newcastle stadium", name: "Newcastle Stadium" },
  { key: "one new zealand stadium", name: "Eden Park Auckland" },
  { key: "principality stadium", name: "Principality Stadium Cardiff" },
  { key: "prince chichibu memorial stadium", name: "Prince Chichibu Stadium" },
  { key: "sky stadium", name: "Sky Stadium Wellington" },
  { key: "stade de france", name: "Stade de France Paris" },
  { key: "stade pierre-mauroy", name: "Stade Pierre-Mauroy Lille" },
  { key: "stadio luigi ferraris", name: "Stadio Luigi Ferraris Genoa" },
  { key: "stadio olimpico", name: "Stadio Olimpico Rome" },
  { key: "sydney football stadium", name: "Sydney Football Stadium" },
]

function downloadImage(url, filename) {
  return new Promise((resolve) => {
    const filepath = path.join(STADIUMS_DIR, filename)
    const file = fs.createWriteStream(filepath)

    const request = https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file)
      } else {
        file.destroy()
        resolve(false)
        return
      }

      file.on('finish', () => {
        file.close()
        resolve(true)
      })

      file.on('error', () => {
        fs.unlink(filepath, () => {})
        resolve(false)
      })
    })

    request.on('error', (err) => {
      console.error(`Download error: ${err.message}`)
      fs.unlink(filepath, () => {})
      resolve(false)
    })

    request.setTimeout(10000, () => {
      request.destroy()
      fs.unlink(filepath, () => {})
      resolve(false)
    })
  })
}

function generateStadiumGradient(stadiumKey) {
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

  return `linear-gradient(135deg, hsl(${hue1}, ${saturation}%, ${lightness}%), hsl(${hue2}, ${saturation}%, ${lightness + 10}%))`
}

async function main() {
  console.log('=== Stadium Images Setup ===\n')
  console.log('📁 Stadiums directory:', STADIUMS_DIR)
  console.log(`📊 Total stadiums: ${STADIUMS.length}\n`)

  console.log('ℹ️  Using generated gradient backgrounds.')
  console.log('💡 Tip: To add real stadium images:\n')
  console.log('1. Download 1200x800px stadium photos')
  console.log('2. Place in:', STADIUMS_DIR)
  console.log('3. Update src/lib/stadium-images.ts with mappings\n')

  // Generate mapping with gradients
  const mapping = {}
  STADIUMS.forEach((stadium) => {
    mapping[stadium.key] = null
  })

  // Save mapping file
  const mappingPath = path.join(__dirname, '../src/lib/stadium-images.ts')
  const mappingContent = `// Stadium background image mapping
// Maps stadium keys to their background image URLs or generates gradient backgrounds

import type { StadiumSummary } from './stadiums'

export const STADIUM_IMAGE_MAP: Readonly<Record<string, string | null>> = {
${STADIUMS.map(s => `  '${s.key}|'/*TODO: Add country*/'': null,`).join('\n')}
}

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

  fs.writeFileSync(mappingPath, mappingContent)
  console.log('✅ Mapping file ready at: src/lib/stadium-images.ts')
  console.log('\n📚 For detailed instructions, see: STADIUM_IMAGES_GUIDE.md\n')

  // Show a sample gradient
  console.log('Sample gradient for "at&t stadium":')
  console.log(generateStadiumGradient('at&t stadium'))
}

main().catch(console.error)
