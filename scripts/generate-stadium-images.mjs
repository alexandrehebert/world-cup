#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STADIUMS_DIR = path.join(__dirname, '../public/assets/stadiums')

if (!fs.existsSync(STADIUMS_DIR)) {
  fs.mkdirSync(STADIUMS_DIR, { recursive: true })
}

const STADIUMS = [
  { key: 'at&t stadium', name: 'AT&T Stadium' },
  { key: 'arrowhead stadium', name: 'Arrowhead Stadium' },
  { key: 'bc place', name: 'BC Place' },
  { key: 'bmo field', name: 'BMO Field' },
  { key: 'estadio azteca', name: 'Estadio Azteca' },
  { key: 'gillette stadium', name: 'Gillette Stadium' },
  { key: 'hard rock stadium', name: 'Hard Rock Stadium' },
  { key: "levi's stadium", name: "Levi's Stadium" },
  { key: 'lumen field', name: 'Lumen Field' },
  { key: 'mercedes-benz stadium', name: 'Mercedes-Benz Stadium' },
  { key: 'metlife stadium', name: 'MetLife Stadium' },
  { key: 'nrg stadium', name: 'NRG Stadium' },
  { key: 'sofi stadium', name: 'SoFi Stadium' },
  { key: 'lincoln financial field', name: 'Lincoln Financial Field' },
  { key: 'stade de france', name: 'Stade de France' },
  { key: 'murrayfield', name: 'Murrayfield' },
  { key: 'principality stadium', name: 'Principality Stadium' },
  { key: 'eden park', name: 'Eden Park' },
  { key: 'stadio olimpico', name: 'Stadio Olimpico' },
  { key: 'aviva stadium', name: 'Aviva Stadium' },
]

function downloadImage(url, filepath) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filepath)
    https.get(url, (res) => {
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve(true)
      })
    }).on('error', () => {
      fs.unlink(filepath, () => {})
      resolve(false)
    })
  })
}

async function main() {
  console.log('📥 Downloading stadium images...\n')

  let downloaded = 0
  const mapping = {}

  for (let i = 0; i < STADIUMS.length; i++) {
    const stadium = STADIUMS[i]
    const filename = stadium.key.replace(/[&']/g, '').replace(/\s+/g, '-') + '.jpg'
    const filepath = path.join(STADIUMS_DIR, filename)
    
    process.stdout.write(String(i + 1).padStart(2) + '. ' + stadium.name.padEnd(30) + ' ... ')

    const url = 'https://picsum.photos/1200/800?random=' + i
    
    try {
      const success = await downloadImage(url, filepath)
      if (success) {
        mapping[stadium.key] = '/assets/stadiums/' + filename
        console.log('✅')
        downloaded++
      } else {
        console.log('⏭️')
      }
    } catch (err) {
      console.log('⏭️')
    }

    await new Promise(r => setTimeout(r, 200))
  }

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

  let mappingLines = 'export const STADIUM_IMAGE_MAP: Readonly<Record<string, string | null>> = {\n'
  for (const s of stadiumKeys) {
    const key = s.key + '|' + s.country
    const url = mapping[s.key]
    const value = url ? "'" + url + "'" : 'null'
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

  console.log('\n✨ Complete! Downloaded ' + downloaded + ' stadium images')
  console.log('📁 Saved to: public/assets/stadiums/')
  console.log('📄 Updated: src/lib/stadium-images.ts')
}

main().catch(console.error)
