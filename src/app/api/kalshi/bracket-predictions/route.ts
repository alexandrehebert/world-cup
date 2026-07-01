import { NextResponse } from 'next/server'

type KalshiMarketRecord = {
  ticker: string
  event_ticker: string
  yes_bid_dollars?: string
  yes_ask_dollars?: string
}

type KalshiMarketsResponse = {
  markets: KalshiMarketRecord[]
  cursor?: string
}

type AdvanceProbabilitiesByPairKey = Record<string, Record<string, number>>

const KALSHI_SERIES_TICKER = 'KXWCADVANCE'
const KALSHI_MARKETS_LIMIT = 1000
const KALSHI_DEFAULT_BASE_URL = 'https://external-api.kalshi.com/trade-api/v2'
const KALSHI_MAX_PAGES = 20

const parseProbability = (value: string | undefined): number | null => {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return null
  if (parsed < 0 || parsed > 1) return null
  return parsed
}

const getMidpointProbability = (market: KalshiMarketRecord): number | null => {
  const bid = parseProbability(market.yes_bid_dollars)
  const ask = parseProbability(market.yes_ask_dollars)

  if (bid !== null && ask !== null) {
    return (bid + ask) / 2
  }

  if (ask !== null) {
    return ask
  }

  return bid
}

const getTeamCodeFromTicker = (ticker: string): string | null => {
  const suffix = ticker.split('-').at(-1)?.trim().toUpperCase()
  if (!suffix || !/^[A-Z]{3}$/.test(suffix)) return null
  return suffix
}

const getPairKey = (firstTeamCode: string, secondTeamCode: string) => {
  return [firstTeamCode, secondTeamCode].sort().join('|')
}

const fetchKalshiAdvanceMarkets = async (): Promise<KalshiMarketRecord[]> => {
  const configuredBaseUrl = process.env.KALSHI_API_BASE_URL?.trim()
  const kalshiApiBaseUrl = configuredBaseUrl?.length ? configuredBaseUrl : KALSHI_DEFAULT_BASE_URL
  const markets: KalshiMarketRecord[] = []
  let cursor: string | undefined
  let pagesFetched = 0

  while (true) {
    pagesFetched += 1
    if (pagesFetched > KALSHI_MAX_PAGES) {
      throw new Error('Kalshi markets pagination exceeded safety limit')
    }

    const requestUrl = new URL('/markets', kalshiApiBaseUrl)
    requestUrl.searchParams.set('series_ticker', KALSHI_SERIES_TICKER)
    requestUrl.searchParams.set('mve_filter', 'exclude')
    requestUrl.searchParams.set('limit', `${KALSHI_MARKETS_LIMIT}`)
    if (cursor) {
      requestUrl.searchParams.set('cursor', cursor)
    }

    const response = await fetch(requestUrl.toString(), {
      cache: 'no-store',
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    })

    if (!response.ok) {
      throw new Error(`Kalshi markets request failed (${response.status})`)
    }

    const payload = (await response.json()) as KalshiMarketsResponse
    markets.push(...(payload.markets ?? []))
    cursor = payload.cursor?.trim()

    if (!cursor) {
      break
    }
  }

  return markets
}

const buildAdvanceProbabilityMap = (markets: KalshiMarketRecord[]): AdvanceProbabilitiesByPairKey => {
  const eventProbabilities = new Map<string, Map<string, number>>()

  for (const market of markets) {
    const teamCode = getTeamCodeFromTicker(market.ticker)
    const probability = getMidpointProbability(market)
    if (!teamCode || probability === null) continue

    const eventMap = eventProbabilities.get(market.event_ticker) ?? new Map<string, number>()
    eventMap.set(teamCode, probability)
    eventProbabilities.set(market.event_ticker, eventMap)
  }

  const byPairKey: AdvanceProbabilitiesByPairKey = {}

  for (const teamProbabilities of eventProbabilities.values()) {
    const teamCodes = [...teamProbabilities.keys()]
    if (teamCodes.length < 2) continue

    for (let firstIndex = 0; firstIndex < teamCodes.length - 1; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < teamCodes.length; secondIndex += 1) {
        const firstTeamCode = teamCodes[firstIndex]
        const secondTeamCode = teamCodes[secondIndex]
        const pairKey = getPairKey(firstTeamCode, secondTeamCode)
        byPairKey[pairKey] = {
          [firstTeamCode]: teamProbabilities.get(firstTeamCode) ?? 0,
          [secondTeamCode]: teamProbabilities.get(secondTeamCode) ?? 0,
        }
      }
    }
  }

  return byPairKey
}

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const markets = await fetchKalshiAdvanceMarkets()
    const probabilitiesByPairKey = buildAdvanceProbabilityMap(markets)

    return NextResponse.json(
      {
        source: 'kalshi',
        seriesTicker: KALSHI_SERIES_TICKER,
        generatedAt: new Date().toISOString(),
        probabilitiesByPairKey,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unable to load Kalshi bracket predictions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
