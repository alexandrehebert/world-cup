#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STADIUMS_DIR = path.join(__dirname, '../public/assets/stadiums')

if (!fs.existsSync(STADIUMS_DIR)) {
  fs.mkdirSync(STADIUMS_DIR, { recursive: true })
}

const STADIUMS = [
  { key: 'at&t stadium', name: 'AT&T Stadium', color1: '#003478', color2: '#B0B7BC' },
  { key: 'arrowhead stadium', name: 'Arrowhead Stadium', color1: '#E31828', color2: '#FFB612' },
  { key: 'bc place', name: 'BC Place', color1: '#003DA5', color2: '#FFFFFF' },
  { key: 'bmo field', name: 'BMO Field', color1: '#002D72', color2: '#FFFFFF' },
  { key: 'estadio azteca', name: 'Estadio Azteca', color1: '#003A70', color2: '#FFDA03' },
  { key: 'gillette stadium', name: 'Gillette Stadium', color1: '#002C62', color2: '#BD3039' },
  { key: 'hard rock stadium', name: 'Hard Rock Stadium', color1: '#008E97', color2: '#FF6600' },
  { key: "levi's stadium", name: "Levi's Stadium", color1: '#AA0000', color2: '#FFB612' },
  { key: 'lumen field', name: 'Lumen Field', color1: '#002C5C', color2: '#69BE28' },
  { key: 'mercedes-benz stadium', name: 'Mercedes-Benz Stadium', color1: '#A71930', color2: '#000000' },
  { key: 'metlife stadium', name: 'MetLife Stadium', color1: '#0B2150', color2: '#FF6600' },
  { key: 'nrg stadium', name: 'NRG Stadium', color1: '#EB6E1F', color2: '#003DA5' },
  { key: 'sofi stadium', name: 'SoFi Stadium', color1: '#0072CE', color2: '#FFB81C' },
  { key: 'lincoln financial field', name: 'Lincoln Financial Field', color1: '#004687', color2: '#005F00' },
  { key: 'stade de france', name: 'Stade de France', color1: '#1F77B4', color2: '#FF7F0E' },
  { key: 'murrayfield', name: 'Murrayfield', color1: '#0051BA', color2: '#FFFFFF' },
  { key: 'principality stadium', name: 'Principality Stadium', color1: '#C8102E', color2: '#FFFFFF' },
  { key: 'eden park', name: 'Eden Park', color1: '#000000', color2: '#FFFFFF' },
  { key: 'stadio olimpico', name: 'Stadio Olimpico', color1: '#FFCC00', color2: '#003DA5' },
  { key: 'aviva stadium', name: 'Aviva Stadium', color1: '#003DA5', color2: '#00A86B' },
]

function createSVGImage(name, color1, color2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
    <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="${color1}" opacity="0.1"/>
      <rect x="10" y="10" width="20" height="20" fill="${color2}" opacity="0.05"/>
    </pattern>
  </defs>
  
  <!-- Background gradient -->
  <rect width="1200" height="800" fill="url(#grad)"/>
  <rect width="1200" height="800" fill="url(#pattern)"/>
  
  <!-- Stadium silhouette concept -->
  <g opacity="0.15">
    <!-- Upper stands -->
    <path d="M 150 200 L 1050 200 L 1000 400 L 200 400 Z" fill="white"/>
    <!-- Lower stands -->
    <path d="M 200 400 L 1000 400 L 950 650 L 250 650 Z" fill="white" opacity="0.8"/>
    <!-- Field -->
    <ellipse cx="600" cy="500" rx="350" ry="150" fill="white" opacity="0.1"/>
  </g>
  
  <!-- Text -->
  <text x="600" y="750" font-size="48" font-weight="bold" text-anchor="middle" fill="white" opacity="0.8">
    ${name}
  </text>
</svg>`
}

async function main() {
  console.log('🎨 Creating stadium placeholder images...\n')

  let created = 0

  for (const stadium of STADIUMS) {
    const filename = stadium.key.replace(/[&']/g, '').replace(/\s+/g, '-') + '.svg'
    const filepath = path.join(STADIUMS_DIR, filename)
    
    const svg = createSVGImage(stadium.name, stadium.color1, stadium.color2)
    
    fs.writeFileSync(filepath, svg)
    console.log('✅ ' + stadium.name)
    created++
  }

  console.log('\n✨ Created ' + created + ' stadium placeholder images')
  console.log('📁 Location: public/assets/stadiums/')
}

main().catch(console.error)
