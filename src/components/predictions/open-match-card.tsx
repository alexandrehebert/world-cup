import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { usePredictions } from '../../contexts/predictions-context'
import { useTimeZone } from '../../contexts/time-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate } from '../../lib/format'
import { Icon } from '../../lib/icons'
import type { MatchRecord } from '../../types/tournament'

interface Props {
  match: MatchRecord
}

export const OpenMatchCard = ({ match }: Props) => {
  const navigate = useNavigate()
  const { getMatchPredictionPath } = useDashboard()
  const { locale, t } = useLocale()
  const timeZone = useTimeZone()
  const { teamsById } = useTournament()
  const { predictionsByMatch, predictionDistributionsByMatch } = usePredictions()

  const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
  const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
  const homeLabel = homeTeam ? (t.teams[homeTeam.id] ?? homeTeam.name) : t.labels.tbd
  const awayLabel = awayTeam ? (t.teams[awayTeam.id] ?? awayTeam.name) : t.labels.tbd

  const prediction = predictionsByMatch[match.id]
  const predictionLabel = prediction
    ? prediction.type === 'score' && prediction.homeScore !== undefined && prediction.awayScore !== undefined
      ? `${prediction.homeScore}-${prediction.awayScore}`
      : prediction.outcome === 'home'
        ? homeLabel
        : prediction.outcome === 'away'
          ? awayLabel
          : t.labels.draw
    : null

  const distribution = predictionDistributionsByMatch[match.id] ?? {
    matchId: match.id,
    homeCount: 0,
    drawCount: 0,
    awayCount: 0,
    totalPredictions: 0,
  }
  const total = distribution.totalPredictions
  const homeShare = total > 0 ? distribution.homeCount / total : 0
  const drawShare = total > 0 ? distribution.drawCount / total : 0
  const awayShare = total > 0 ? distribution.awayCount / total : 0
  const maxShare = Math.max(homeShare, drawShare, awayShare)
  const dominantOutcome = maxShare === 0 ? 'neutral' : homeShare === maxShare ? 'home' : drawShare === maxShare ? 'draw' : 'away'
  const heatColor = { home: 'rgb(52 211 153)', draw: 'rgb(168 162 158)', away: 'rgb(56 189 248)', neutral: 'rgb(161 161 170)' } as const
  const heatOpacity = total > 0 ? 0.25 + maxShare * 0.55 : 0.2
  const trendPos = Math.round((drawShare * 50 + awayShare * 100) * 10) / 10
  const trendTooltip = `${homeLabel}: ${Math.round(homeShare * 100)}% • ${t.labels.draw}: ${Math.round(drawShare * 100)}% • ${awayLabel}: ${Math.round(awayShare * 100)}%`

  const { localDateTime } = formatMatchDate(match.kickoff, locale, timeZone, t.labels.today)

  return (
    <button
      type="button"
      onClick={() => navigate(getMatchPredictionPath(match.id))}
      className="block w-full cursor-pointer text-left"
      aria-label={`${homeLabel} ${t.labels.vs} ${awayLabel}`}
    >
      <article className="space-y-3 border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:bg-[var(--surface-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--text-strong)]">{homeLabel} {t.labels.vs} {awayLabel}</p>
            <p className="text-xs text-[var(--text-muted)]">{localDateTime}</p>
          </div>
          <Icon name="chevron_right" className="text-[20px] text-[var(--text-muted)]" />
        </div>

        {predictionLabel ? (
          <p className="text-xs text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-soft)]">{t.labels.yourPrediction}:</span>{' '}
            <span className="font-semibold text-[var(--accent-text)]">{predictionLabel}</span>
          </p>
        ) : null}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>{t.labels.predictionTrend}</span>
            <span>{total} {t.labels.players}</span>
          </div>
          <div title={trendTooltip} className="relative h-2 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface-strong)]">
            <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--text-muted)]/40" />
            {total > 0 ? (
              <>
                <span aria-hidden className="absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[10px]" style={{ left: `${trendPos}%`, backgroundColor: heatColor[dominantOutcome], opacity: heatOpacity }} />
                <span aria-hidden className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--surface)]" style={{ left: `${trendPos}%`, backgroundColor: heatColor[dominantOutcome] }} />
              </>
            ) : null}
          </div>
        </div>
      </article>
    </button>
  )
}
