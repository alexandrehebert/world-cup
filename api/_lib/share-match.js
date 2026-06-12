const normalizeSlugPart = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')

  return normalized || 'tbd'
}

const normalizeMatchCode = (value) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '') || 'TBD'

const getTeamsById = (data) => Object.fromEntries((data.teams ?? []).map((team) => [team.id, team]))

export const buildMatchSlugMaps = (data) => {
  const teamsById = getTeamsById(data)
  const matchIdToSlug = {}
  const matchIdToPath = {}
  const pathToMatchId = {}
  const slugToMatchId = {}
  const duplicateCounts = new Map()

  const matches = [...(data.matches ?? [])].sort((first, second) => {
    if (first.kickoff !== second.kickoff) {
      return first.kickoff.localeCompare(second.kickoff)
    }

    return first.id.localeCompare(second.id)
  })

  for (const match of matches) {
    const homeCode = match.home.teamId ? teamsById[match.home.teamId]?.code : undefined
    const awayCode = match.away.teamId ? teamsById[match.away.teamId]?.code : undefined
    const baseSlug = `${normalizeSlugPart(homeCode)}-${normalizeSlugPart(awayCode)}`
    const count = (duplicateCounts.get(baseSlug) ?? 0) + 1
    duplicateCounts.set(baseSlug, count)

    const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`
    const pathKey = `${normalizeMatchCode(homeCode)}/vs/${normalizeMatchCode(awayCode)}`

    matchIdToSlug[match.id] = slug
    matchIdToPath[match.id] = pathKey
    if (!pathToMatchId[pathKey]) {
      pathToMatchId[pathKey] = match.id
    }
    slugToMatchId[slug] = match.id
  }

  return { matchIdToSlug, matchIdToPath, pathToMatchId, slugToMatchId, teamsById }
}

export const resolveMatchFromKey = (data, matchKey) => {
  if (!matchKey) {
    return null
  }

  const { pathToMatchId, slugToMatchId, teamsById } = buildMatchSlugMaps(data)
  const normalizedKey = String(matchKey).replace(/^\/+|\/+$/g, '')
  const matchPath = normalizedKey.match(/^(?:match\/)?([^/]+)\/vs\/([^/]+)$/i)
  const pathKey = matchPath ? `${normalizeMatchCode(matchPath[1])}/vs/${normalizeMatchCode(matchPath[2])}` : null
  const resolvedMatchId = (pathKey && pathToMatchId[pathKey]) || slugToMatchId[normalizedKey] || normalizedKey
  const match = (data.matches ?? []).find((entry) => entry.id === resolvedMatchId)

  if (!match) {
    return null
  }

  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined

  return {
    match,
    homeTeam,
    awayTeam,
    path: buildMatchSlugMaps(data).matchIdToPath[match.id] ?? `${normalizeMatchCode(homeTeam?.code)}/vs/${normalizeMatchCode(awayTeam?.code)}`,
    slug: buildMatchSlugMaps(data).matchIdToSlug[match.id] ?? match.id,
  }
}

const getMatchScoreText = (match) => {
  const homeScore = typeof match.home.score === 'number' ? match.home.score : null
  const awayScore = typeof match.away.score === 'number' ? match.away.score : null

  if (homeScore === null || awayScore === null) {
    return null
  }

  return `${homeScore}-${awayScore}`
}

const getLiveText = (match) => {
  const shortDetail = typeof match.live?.shortDetail === 'string' ? match.live.shortDetail.trim() : ''
  if (shortDetail) {
    return shortDetail
  }

  const detail = typeof match.live?.detail === 'string' ? match.live.detail.trim() : ''
  if (detail) {
    return detail
  }

  const displayClock = typeof match.live?.displayClock === 'string' ? match.live.displayClock.trim() : ''
  return displayClock || null
}

export const getMatchPreviewData = (data, matchKey, requestUrl) => {
  const resolved = resolveMatchFromKey(data, matchKey)

  if (!resolved) {
    return null
  }

  const { match, homeTeam, awayTeam, slug } = resolved
  const shareUrl = new URL(`/match/${resolved.path}`, requestUrl.origin).toString()
  const imageUrl = new URL(`/match/${resolved.path}?image=1`, requestUrl.origin).toString()
  const appUrl = new URL(`/matches?match=${encodeURIComponent(slug)}`, requestUrl.origin).toString()
  const homeLabel = homeTeam?.name ?? homeTeam?.code ?? 'TBD'
  const awayLabel = awayTeam?.name ?? awayTeam?.code ?? 'TBD'
  const scoreText = getMatchScoreText(match)
  const liveText = getLiveText(match)
  const statusLabel = match.status === 'live' ? 'Live' : match.status === 'finished' ? 'Finished' : 'Scheduled'
  const venueText = [match.venue?.stadium, match.venue?.city, match.venue?.country].filter(Boolean).join(' · ')
  const kickoffText = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: match.venue?.timeZone ?? 'UTC',
  }).format(new Date(match.kickoff))

  const descriptionParts = [
    statusLabel,
    scoreText ? `${homeLabel} ${scoreText} ${awayLabel}` : `${homeLabel} vs ${awayLabel}`,
    liveText,
    venueText,
  ].filter((value) => Boolean(value))

  return {
    match,
    homeLabel,
    awayLabel,
    scoreText,
    liveText,
    statusLabel,
    venueText,
    kickoffText,
    shareUrl,
    imageUrl,
    appUrl,
    title: `${homeLabel} ${scoreText ?? 'vs'} ${awayLabel} | FIFA World Cup 2026`,
    description: descriptionParts.join(' · '),
  }
}

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const escapeAttribute = escapeHtml
