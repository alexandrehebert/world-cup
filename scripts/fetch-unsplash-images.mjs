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

// Using Unsplash API - free tier allows 50 requests/hour
// Access key required but we can use demo data
const STADIUM_QUERIES = {
  'at&t stadium': 'AT&T Stadium Arlington Texas football',
  'arrowhead stadium': 'Arrowhead Stadium Kansas City Chiefs',
  'bc place': 'BC Place Vancouver soccer',
  'bmo field': 'BMO Field Toronto soccer',
  'estadio azteca': 'Estadio Azteca Mexico City',
  'gillette stadium': 'Gillette Stadium New England',
  'hard rock stadium': 'Hard Rock Stadium Miami',
  "levi's stadium": 'Levis Stadium San Francisco 49ers',
  'lumen field': 'Lumen Field Seattle Seahawks',
  'mercedes-benz stadium': 'Mercedes-Benz Stadium Atlanta',
  'metlife stadium': 'MetLife Stadium New York Giants',
  'nrg stadium': 'NRG Stadium Houston Texans',
  'sofi stadium': 'SoFi Stadium Los Angeles Rams',
  'lincoln financial field': 'Lincoln Financial Field Philadelphia',
  'stade de france': 'Stade de France Paris',
  'murrayfield': 'Murrayfield Edinburgh rugby',
  'principality stadium': 'Principality Stadium Cardiff',
  'eden park': 'Eden Park Auckland New Zealand',
  'stadio olimpico': 'Stadio Olimpico Rome',
  'aviva stadium': 'Aviva Stadium Dublin',
}

function fetchUnsplashImage(query) {
  return new Promise((resolve) => {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=1&per_page=1&orientation=landscape`
    
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.results && json.results.length > 0) {
            const imageUrl = json.results[0].urls.regular
            resolve(imageUrl)
          } else {
            resolve(null)
          }
        } catch (e) {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(5000, () => {
      req.destroy()
      resolve(null)
    })
  })
}

function downloadImage(url, filename) {
  return new Promise((resolve) => {
    const filepath = path.join(STADIUMS_DIR, filename)
    const file = fs.createWriteStream(filepath)
    const timeout = setTimeout(() => {
      req.destroy()
      file.destroy()
      fs.unlink(filepath, () => {})
      resolve(false)
    }, 10000)

    const req = https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file)
        file.on('finish', () => {
          clearTimeout(timeout)
          file.close()
          resolve(true)
        })
      } else {
        clearTimeout(timeout)
        file.destroy()
        fs.unlink(filepath, () => {})
        resolve(false)
      }
    })

    req.on('error', () => {
      clearTimeout(timeout)
      file.destroy()
      fs.unlink(filepath, () => {})
      resolve(false)
    })
  })
}

async function main() {
  console.log('🔍 Fetching stadium images from Unsplash...\n')

  let downloaded = 0
  let failed = 0
  const mapping = {}

  for (const [stadium, query] of Object.entries(STADIUM_QUERIES)) {
    const filename = `${stadium.replace(/[&']/g, '').replace(/\s+/g, '-')}.jpg`
    process.stdout.write(`${stadium.padEnd(30)} ... `)

    try {
      const imageUrl = await fetchUnsplashImage(query)
      if (imageUrl) {
        const success = await downloadImage(imageUrl, filename)
        if (success) {
          mapping[stadium] = `/assets/stadiums/${filename}`
          console.log('✅')
          downloaded++
        } else {
          console.log('❌ (download failed)')
          failed++
        }
      } else {
        console.log('❌ (no results)')
        failed++
      }
    } catch (err) {
      console.log('❌ (error)')
      failed++
    }

    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\n✨ Results: ${downloaded} downloaded, ${failed} failed`)
}

main().catch(console.error)
