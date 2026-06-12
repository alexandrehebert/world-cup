import { loadTournamentData } from './_lib/tournament-data.js'
import { escapeAttribute, escapeHtml, getMatchPreviewData } from './_lib/share-match.js'

const renderPreviewPage = (preview) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="FIFA World Cup 2026" />
    <meta property="og:title" content="${escapeAttribute(preview.title)}" />
    <meta property="og:description" content="${escapeAttribute(preview.description)}" />
    <meta property="og:url" content="${escapeAttribute(preview.shareUrl)}" />
    <meta property="og:image" content="${escapeAttribute(preview.imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttribute(preview.title)}" />
    <meta name="twitter:description" content="${escapeAttribute(preview.description)}" />
    <meta name="twitter:image" content="${escapeAttribute(preview.imageUrl)}" />
    <title>${escapeHtml(preview.title)}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg-1: #07111f;
        --bg-2: #111c33;
        --card: rgba(10, 17, 30, 0.82);
        --border: rgba(255, 255, 255, 0.12);
        --text: #f4f7fb;
        --muted: rgba(244, 247, 251, 0.72);
        --accent: #f4c542;
        --accent-strong: #7fe5c5;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(247, 197, 66, 0.18), transparent 32%),
          radial-gradient(circle at bottom right, rgba(127, 229, 197, 0.14), transparent 28%),
          linear-gradient(135deg, var(--bg-1), var(--bg-2));
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .shell {
        width: min(920px, 100%);
        border: 1px solid var(--border);
        background: var(--card);
        backdrop-filter: blur(22px);
        border-radius: 28px;
        overflow: hidden;
        box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35);
      }

      .hero {
        padding: 24px 24px 12px;
        border-bottom: 1px solid var(--border);
      }

      .eyebrow {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: var(--accent);
        margin: 0;
      }

      h1 {
        margin: 12px 0 10px;
        font-size: clamp(28px, 4vw, 44px);
        line-height: 1.02;
      }

      .copy {
        margin: 0;
        max-width: 72ch;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.55;
      }

      .content {
        display: grid;
        gap: 20px;
        padding: 24px;
      }

      .match-card {
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 22px;
        background: rgba(255, 255, 255, 0.04);
      }

      .topline {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 20px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--border);
        color: var(--text);
        background: rgba(255, 255, 255, 0.06);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .badge.live::before {
        content: '';
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--accent-strong);
        box-shadow: 0 0 0 0 rgba(127, 229, 197, 0.45);
        animation: pulse 1.8s infinite;
      }

      .meta {
        color: var(--muted);
        font-size: 13px;
      }

      .score-grid {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 16px;
        margin: 20px 0;
      }

      .team {
        min-width: 0;
      }

      .team .name {
        margin: 0;
        font-size: clamp(22px, 3vw, 34px);
        font-weight: 800;
        line-height: 1.08;
      }

      .team .code {
        margin: 8px 0 0;
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

      .score {
        text-align: center;
      }

      .score .value {
        margin: 0;
        font-size: clamp(42px, 8vw, 78px);
        font-weight: 900;
        letter-spacing: -0.05em;
        line-height: 0.95;
      }

      .score .detail {
        margin: 10px 0 0;
        color: var(--accent);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .info {
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border);
      }

      .info .label {
        margin: 0 0 6px;
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      .info .value {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.45;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        padding: 0 24px 24px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 10px 16px;
        border-radius: 999px;
        text-decoration: none;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.02em;
      }

      .button.primary {
        color: #09121d;
        background: linear-gradient(135deg, #f6d76b, #f4c542);
      }

      .button.secondary {
        color: var(--text);
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.05);
      }

      .footnote {
        margin: 0;
        padding: 0 24px 24px;
        color: var(--muted);
        font-size: 12px;
      }

      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(127, 229, 197, 0.42); }
        70% { box-shadow: 0 0 0 10px rgba(127, 229, 197, 0); }
        100% { box-shadow: 0 0 0 0 rgba(127, 229, 197, 0); }
      }

      @media (max-width: 720px) {
        .content, .hero { padding-left: 18px; padding-right: 18px; }
        .score-grid, .info-grid { grid-template-columns: 1fr; }
        .score { order: -1; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">FIFA World Cup 2026</p>
        <h1>${escapeHtml(preview.title)}</h1>
        <p class="copy">${escapeHtml(preview.description)}</p>
      </section>

      <section class="content">
        <div class="match-card">
          <div class="topline">
            <span class="badge ${preview.statusLabel.toLowerCase() === 'live' ? 'live' : ''}">${escapeHtml(preview.statusLabel)}</span>
            <p class="meta">${escapeHtml(preview.kickoffText)}</p>
          </div>

          <div class="score-grid">
            <div class="team">
              <p class="name">${escapeHtml(preview.homeLabel)}</p>
              <p class="code">Home team</p>
            </div>

            <div class="score">
              <p class="value">${escapeHtml(preview.scoreText ?? 'VS')}</p>
              <p class="detail">${escapeHtml(preview.liveText ?? preview.statusLabel)}</p>
            </div>

            <div class="team" style="text-align:right;">
              <p class="name">${escapeHtml(preview.awayLabel)}</p>
              <p class="code">Away team</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info">
              <p class="label">Venue</p>
              <p class="value">${escapeHtml(preview.venueText)}</p>
            </div>
            <div class="info">
              <p class="label">Share link</p>
              <p class="value">Open this match in the app</p>
            </div>
            <div class="info">
              <p class="label">Stage</p>
              <p class="value">Match details and results</p>
            </div>
          </div>
        </div>
      </section>

      <div class="actions">
        <a class="button primary" href="${escapeAttribute(preview.shareUrl)}">Open match</a>
        <a class="button secondary" href="/matches?match=${escapeAttribute(encodeURIComponent(preview.match.id))}">Open dashboard</a>
      </div>

      <p class="footnote">This preview is generated for sharing and uses live match data when available.</p>
    </main>
  </body>
</html>`

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0')
  response.setHeader('Pragma', 'no-cache')
  response.setHeader('Expires', '0')
  response.setHeader('Content-Type', 'text/html; charset=utf-8')

  try {
    const data = await loadTournamentData()
    const requestUrl = new URL(request.url, `https://${request.headers.host}`)
    const matchKey = requestUrl.searchParams.get('matchPath') ?? requestUrl.searchParams.get('match') ?? requestUrl.pathname
    const preview = matchKey ? getMatchPreviewData(data, matchKey, requestUrl) : null

    if (!preview) {
      return response.status(404).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Match not found</title>
  </head>
  <body style="margin:0;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#09111f;color:#f4f7fb;">
    <main style="max-width:560px;padding:24px;text-align:center;">
      <h1 style="margin:0 0 12px;font-size:32px;">Match not found</h1>
      <p style="margin:0 0 20px;color:rgba(244,247,251,0.72);">The shared link does not match a known fixture.</p>
      <a href="/matches" style="display:inline-flex;padding:12px 18px;border-radius:999px;background:#f4c542;color:#09111f;text-decoration:none;font-weight:800;">Open dashboard</a>
    </main>
  </body>
</html>`)
    }

    if (requestUrl.searchParams.get('image') === '1') {
      return response.status(200).send(renderImage(preview))
    }

    return response.status(200).send(renderPreviewPage(preview))
  } catch (error) {
    return response.status(500).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Unable to load match preview</title>
  </head>
  <body style="margin:0;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#09111f;color:#f4f7fb;">
    <main style="max-width:560px;padding:24px;text-align:center;">
      <h1 style="margin:0 0 12px;font-size:32px;">Unable to load match preview</h1>
      <p style="margin:0;color:rgba(244,247,251,0.72);">${escapeHtml(error instanceof Error ? error.message : 'Unknown error')}</p>
    </main>
  </body>
</html>`)
  }
}

const renderImage = (preview) => `<?xml version="1.0" encoding="UTF-8"?>
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
    <text x="84" y="378" font-size="122" font-family="Inter, Arial, sans-serif" font-weight="900" letter-spacing="-6">${escapeXml(preview.scoreText ?? 'VS')}</text>
    <text x="84" y="438" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="700" fill="#f4c542">${escapeXml(preview.liveText ?? preview.statusLabel)}</text>
    <text x="84" y="512" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="600" fill="rgba(244,247,251,0.76)">${escapeXml(preview.venueText)}</text>
    <text x="84" y="556" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="600" fill="rgba(244,247,251,0.68)">${escapeXml(preview.kickoffText)}</text>
  </g>
  <g transform="translate(842 132)">
    <rect x="0" y="0" width="274" height="366" rx="34" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)"/>
    <text x="28" y="58" fill="#f4c542" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="3">MATCH</text>
    <text x="28" y="120" fill="#f4f7fb" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="800">Preview</text>
    <text x="28" y="182" fill="rgba(244,247,251,0.7)" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="600">${escapeXml(preview.homeLabel)}</text>
    <text x="28" y="212" fill="rgba(244,247,251,0.7)" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="600">${escapeXml(preview.awayLabel)}</text>
    <text x="28" y="282" fill="#7fe5c5" font-size="56" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(preview.scoreText ?? 'VS')}</text>
    <text x="28" y="330" fill="rgba(244,247,251,0.68)" font-size="16" font-family="Inter, Arial, sans-serif" font-weight="600">${escapeXml(preview.statusLabel)}</text>
  </g>
</svg>`
