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

const STADIUMS = [
  { name: 'att-stadium', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Attstadium.jpg/1200px-Attstadium.jpg' },
  { name: 'arrowhead-stadium', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Arrowhead_Stadium_Exterior.jpg/1200px-Arrowhead_Stadium_Exterior.jpg' },
  { name: 'bc-place', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/BC_Place_Stadium_2010.jpg/1200px-BC_Place_Stadium_2010.jpg' },
]

function downloadFile(url, filepath) {
  return new Promise((resolve) => {
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(filepath)
    const timeout = setTimeout(() => {
      req.destroy()
      file.destroy()
      fs.unlink(filepath, () => {})
      resolve(false)
    }, 8000)

    const req = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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
  console.log('📥 Downloading stadium images from Wikimedia Commons...\n')

  let downloaded = 0

  for (const stadium of STADIUMS) {
    process.stdout.write(stadium.name.padEnd(30) + ' ... ')
    const filepath = path.join(STADIUMS_DIR, stadium.name + '.jpg')
    
    const success = await downloadFile(stadium.url, filepath)
    if (success) {
      const size = fs.statSync(filepath).size
      console.log('✅ (' + Math.round(size / 1024) + 'KB)')
      downloaded++
    } else {
      console.log('❌')
    }

    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\n✨ Downloaded ' + downloaded + ' images')
}

main().catch(console.error)
