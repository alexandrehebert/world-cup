import { loadTournamentData } from './_lib/tournament-data.js'
import { getMatchPreviewData } from './_lib/share-match.js'

const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const renderImage = (preview) => {
  const scoreText = preview.scoreText ?? 'VS'
  const liveText = preview.liveText ?? preview.statusLabel

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(preview.title)}</title>
  <desc id="desc">${escapeXml(preview.description)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#07111f"/>
      <stop offset="1" stop-color="#111c33"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 120) rotate(35) scale(470 390)">
      <stop stop-color="#f4c542" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#f4c542" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(980 530) rotate(-28) scale(380 300)">
      <stop stop-color="#7fe5c5" stop-opacity="0.24"/>
      <stop offset="1" stop-color="#7fe5c5" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" rx="48" fill="url(#bg)"/>
  <rect width="1200" height="630" rx="48" fill="url(#glow)"/>
  <rect width="1200" height="630" rx="48" fill="url(#glow2)"/>
  <g opacity="0.18" stroke="#ffffff">
    <path d="M-60 510C150 420 280 330 430 180C580 30 730 -30 980 0" stroke-width="2"/>
    <path d="M220 680C370 500 500 400 660 350C820 300 990 210 1260 90" stroke-width="2"/>
  </g>
  <g fill="#f4f7fb">
    <text x="84" y="96" font-size="26" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="5">FIFA WORLD CUP 2026</text>
    <text x="84" y="160" font-size="50" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(preview.homeLabel)}</text>
    <text x="84" y="222" font-size="50" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(preview.awayLabel)}</text>
    <text x="84" y="286" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="700" fill="#7fe5c5">${escapeXml(preview.statusLabel)}</text>
    <text x="84" y="378" font-size="122" font-family="Inter, Arial, sans-serif" font-weight="900" letter-spacing="-6">${escapeXml(scoreText)}</text>
    <text x="84" y="438" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="700" fill="#f4c542">${escapeXml(liveText)}</text>
    <text x="84" y="512" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="600" fill="rgba(244,247,251,0.76)">${escapeXml(preview.venueText)}</text>
    <text x="84" y="556" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="600" fill="rgba(244,247,251,0.68)">${escapeXml(preview.kickoffText)}</text>
  </g>
  <g transform="translate(842 132)">
    <rect x="0" y="0" width="274" height="366" rx="34" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)"/>
    <text x="28" y="58" fill="#f4c542" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="3">MATCH</text>
    <text x="28" y="120" fill="#f4f7fb" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="800">Preview</text>
    <text x="28" y="182" fill="rgba(244,247,251,0.7)" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="600">${escapeXml(preview.homeLabel)}</text>
    <text x="28" y="212" fill="rgba(244,247,251,0.7)" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="600">${escapeXml(preview.awayLabel)}</text>
    <text x="28" y="282" fill="#7fe5c5" font-size="56" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(scoreText)}</text>
    <text x="28" y="330" fill="rgba(244,247,251,0.68)" font-size="16" font-family="Inter, Arial, sans-serif" font-weight="600">${escapeXml(preview.statusLabel)}</text>
  </g>
</svg>`
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600')
  response.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')

  try {
    const data = await loadTournamentData()
    const requestUrl = new URL(request.url, `https://${request.headers.host}`)
    const matchKey = requestUrl.searchParams.get('match')
    const preview = matchKey ? getMatchPreviewData(data, matchKey, requestUrl) : null

    if (!preview) {
      return response.status(404).send(renderImage({
        homeLabel: 'Match not found',
        awayLabel: 'Check the link',
        scoreText: 'VS',
        liveText: 'No preview available',
        statusLabel: 'Not found',
        venueText: 'FIFA World Cup 2026',
        kickoffText: 'Invalid match link',
        title: 'Match not found',
        description: 'Invalid match share link',
      }))
    }

    return response.status(200).send(renderImage(preview))
  } catch (error) {
    return response.status(500).send(renderImage({
      homeLabel: 'Unable to load',
      awayLabel: 'match preview',
      scoreText: 'VS',
      liveText: error instanceof Error ? error.message : 'Unknown error',
      statusLabel: 'Error',
      venueText: 'FIFA World Cup 2026',
      kickoffText: '',
      title: 'Unable to load match preview',
      description: 'Unable to load match preview',
    }))
  }
}
