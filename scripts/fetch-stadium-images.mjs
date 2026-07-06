#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import http from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STADIUMS_DIR = path.join(__dirname, '../public/assets/stadiums')

if (!fs.existsSync(STADIUMS_DIR)) {
  fs.mkdirSync(STADIUMS_DIR, { recursive: true })
}

// Stadium URLs from reliable sources (using Commons Wikimedia and other public sources)
const STADIUM_IMAGES = {
  'at&t stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/AT%26T_Stadium_%28aerial%2C_2013%29.jpg/1200px-AT%26T_Stadium_%28aerial%2C_2013%29.jpg',
  'arrowhead stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Arrowhead_Stadium_interior_2010.jpg/1200px-Arrowhead_Stadium_interior_2010.jpg',
  'bc place': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/BCPlace2010.jpg/1200px-BCPlace2010.jpg',
  'bmo field': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/BMO_Field_Sept_2023.jpg/1200px-BMO_Field_Sept_2023.jpg',
  'estadio azteca': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Estadio_Azteca_2007.jpg/1200px-Estadio_Azteca_2007.jpg',
  'gillette stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Gillette_Stadium_September_2009.jpg/1200px-Gillette_Stadium_September_2009.jpg',
  'hard rock stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Hard_Rock_Stadium_2007.jpg/1200px-Hard_Rock_Stadium_2007.jpg',
  'levi\'s stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Levi%27s_Stadium_%2835827192244%29.jpg/1200px-Levi%27s_Stadium_%2835827192244%29.jpg',
  'lumen field': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/CenturyLink_Field_2013.jpg/1200px-CenturyLink_Field_2013.jpg',
  'mercedes-benz stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Mercedes-Benz_Stadium_south_exterior.jpg/1200px-Mercedes-Benz_Stadium_south_exterior.jpg',
  'metlife stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/MetLife_Stadium_2014.jpg/1200px-MetLife_Stadium_2014.jpg',
  'nrg stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/NRG_Stadium_-_Astrodomedome.jpg/1200px-NRG_Stadium_-_Astrodomedome.jpg',
  'sofi stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/SoFi_Stadium_%28May_2021%2C_aerial_view%29.jpg/1200px-SoFi_Stadium_%28May_2021%2C_aerial_view%29.jpg',
  'lincoln financial field': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Lincoln_Financial_Field_2016.jpg/1200px-Lincoln_Financial_Field_2016.jpg',
  'stade de france': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Stade_de_France_2007.jpg/1200px-Stade_de_France_2007.jpg',
  'murrayfield': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Murrayfield_Stadium_2008.jpg/1200px-Murrayfield_Stadium_2008.jpg',
  'principality stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Millennium_Stadium_2.jpg/1200px-Millennium_Stadium_2.jpg',
  'eden park': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Eden_Park_2011.jpg/1200px-Eden_Park_2011.jpg',
  'stadio olimpico': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Stadio_Olimpico_2009.jpg/1200px-Stadio_Olimpico_2009.jpg',
  'aviva stadium': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Aviva_Stadium_2010.jpg/1200px-Aviva_Stadium_2010.jpg',
}

function downloadFile(url, filename) {
  return new Promise((resolve) => {
    const filepath = path.join(STADIUMS_DIR, filename)
    const protocol = url.startsWith('https') ? https : http
    
    const file = fs.createWriteStream(filepath)
    const timeout = setTimeout(() => {
      req.destroy()
      file.destroy()
      fs.unlink(filepath, () => {})
      resolve(false)
    }, 15000)

    const req = protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file)
        file.on('finish', () => {
          clearTimeout(timeout)
          file.close()
          resolve(true)
        })
        file.on('error', (err) => {
          clearTimeout(timeout)
          fs.unlink(filepath, () => {})
          resolve(false)
        })
      } else {
        clearTimeout(timeout)
        file.destroy()
        fs.unlink(filepath, () => {})
        resolve(false)
      }
    })

    req.on('error', (err) => {
      clearTimeout(timeout)
      file.destroy()
      fs.unlink(filepath, () => {})
      resolve(false)
    })
  })
}

async function main() {
  console.log('⬇️  Downloading stadium images...\n')

  let downloaded = 0
  let failed = 0
  const mapping = {}

  for (const [stadium, url] of Object.entries(STADIUM_IMAGES)) {
    const filename = `${stadium.replace(/[&']/g, '').replace(/\s+/g, '-')}.jpg`
    process.stdout.write(`${stadium.padEnd(30)} ... `)

    const success = await downloadFile(url, filename)
    if (success) {
      mapping[stadium] = `/assets/stadiums/${filename}`
      console.log('✅')
      downloaded++
    } else {
      console.log('❌')
      failed++
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Update mapping file
  const mappingPath = path.join(__dirname, '../src/lib/stadium-images.ts')
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

  const mappingContent = `// Auto-generated stadium image mappings
// Downloaded from Wikimedia Commons

import type { StadiumSummary } from './stadiums'

export const STADIUM_IMAGE_MAP: Readonly<Record<string, string | null>> = {
${stadiumKeys.map(s => {
  const key = `${s.key}|${s.country}`
  const url = mapping[s.key]
  return `  '${key}': ${url ? `'${url}'` : 'null'},`
}).join('\n')}
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
  
  console.log(`\n📊 Results:`)
  console.log(`  ✅ Downloaded: ${downloaded}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`\n✨ Mapping updated: src/lib/stadium-images.ts`)
}

main().catch(console.error)
