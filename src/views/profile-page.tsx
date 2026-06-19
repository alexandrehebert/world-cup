import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLocale } from '../contexts/locale-context'
import { useTournament } from '../contexts/tournament-context'
import { formatMatchDate } from '../lib/format'
import { Icon } from '../lib/icons'
import type { PublicProfile } from '../types/predictions'

const getUserInitial = (username: string) => username.trim().charAt(0).toUpperCase() || 'U'

const isPublicProfile = (value: unknown): value is PublicProfile => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PublicProfile>

  return typeof candidate.username === 'string'
    && typeof candidate.rank === 'number'
    && typeof candidate.points === 'number'
    && typeof candidate.predictionsCount === 'number'
    && Array.isArray(candidate.predictions)
}

const statusIconByState = {
  successWithScore: 'sports_score',
  success: 'check_circle',
  failure: 'cancel',
  pending: 'schedule',
} as const

const statusClassByState = {
  successWithScore: 'bg-cyan-500/20 text-cyan-300',
  success: 'bg-emerald-500/20 text-emerald-400',
  failure: 'bg-rose-500/20 text-rose-400',
  pending: 'bg-[var(--surface-soft)] text-[var(--text-muted)]',
} as const

export const ProfilePage = () => {
  const { username } = useParams<{ username: string }>()
  const { locale, t } = useLocale()
  const { matchesById, teamsById } = useTournament()
  const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMissing, setIsMissing] = useState(false)

  useEffect(() => {
    const requestedUsername = username?.trim() ?? ''
    const controller = new AbortController()

    const loadProfile = async () => {
      if (!requestedUsername) {
        setProfile(null)
        setIsMissing(true)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setIsMissing(false)

      try {
        const response = await fetch(`/api/users/${encodeURIComponent(requestedUsername)}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (response.status === 404) {
          setProfile(null)
          setIsMissing(true)
          return
        }

        if (!response.ok) {
          setProfile(null)
          return
        }

        const payload = (await response.json()) as unknown

        if (!isPublicProfile(payload)) {
          setProfile(null)
          return
        }

        setProfile(payload)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setProfile(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      controller.abort()
    }
  }, [username])

  const predictionItems = useMemo(() => {
    if (!profile) {
      return []
    }

    return [...profile.predictions].sort((first, second) => {
      const firstKickoff = matchesById[first.matchId]?.kickoff
      const secondKickoff = matchesById[second.matchId]?.kickoff

      if (firstKickoff && secondKickoff && firstKickoff !== secondKickoff) {
        return secondKickoff.localeCompare(firstKickoff)
      }

      return second.updatedAt.localeCompare(first.updatedAt)
    })
  }, [matchesById, profile])

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.profile}</h2>

      {isLoading ? (
        <div className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">{t.labels.loadingProfile}</div>
      ) : isMissing || !profile ? (
        <div className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">{t.labels.profileNotFound}</div>
      ) : (
        <>
          <div className="flex flex-col gap-4 bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-2xl font-semibold text-[var(--accent-text)]">
                {getUserInitial(profile.username)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-2xl font-semibold text-[var(--text-strong)]">{profile.username}</p>
                <p className="text-sm text-[var(--text-muted)]">{profile.predictionsCount} {t.labels.predictions}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:min-w-[18rem]">
              <ProfileStat label={t.labels.rank} value={`#${profile.rank}`} />
              <ProfileStat label={t.labels.points} value={String(profile.points)} />
              <ProfileStat label={t.labels.predictions} value={String(profile.predictionsCount)} />
            </div>
          </div>

          <div className="space-y-3">
            {predictionItems.length > 0 ? predictionItems.map((prediction) => {
              const match = matchesById[prediction.matchId]
              const homeTeam = match?.home.teamId ? teamsById[match.home.teamId] : undefined
              const awayTeam = match?.away.teamId ? teamsById[match.away.teamId] : undefined
              const homeLabel = homeTeam ? (t.teams[homeTeam.id] ?? homeTeam.name) : t.labels.home
              const awayLabel = awayTeam ? (t.teams[awayTeam.id] ?? awayTeam.name) : t.labels.away
              const displayDate = match
                ? formatMatchDate(match.kickoff, locale, resolvedTimeZone, t.labels.today).localDateTime
                : null
              const hasPredictedScore = prediction.type === 'score'
                && typeof prediction.homeScore === 'number'
                && typeof prediction.awayScore === 'number'
              const predictionLabel = hasPredictedScore
                ? `${prediction.homeScore} - ${prediction.awayScore}`
                : prediction.outcome === 'home'
                  ? homeLabel
                  : prediction.outcome === 'away'
                    ? awayLabel
                    : t.labels.draw
              const hasFinalScore = typeof match?.home.score === 'number' && typeof match?.away.score === 'number'
              const actualScore = hasFinalScore
                ? `${match.home.score} - ${match.away.score}`
                : '—'
              const hasExactScore = hasFinalScore
                && prediction.type === 'score'
                && prediction.homeScore === match.home.score
                && prediction.awayScore === match.away.score
              const status = prediction.scoredAt
                ? (hasExactScore ? 'successWithScore' : prediction.pointsAwarded > 0 ? 'success' : 'failure')
                : 'pending'
              const statusLabel = status === 'successWithScore'
                ? t.labels.predictionSuccessWithScore
                : status === 'success'
                  ? t.labels.predictionSuccessful
                  : status === 'failure'
                    ? t.labels.predictionUnsuccessful
                    : t.labels.predictionPending

              return (
                <article key={`${prediction.matchId}|${prediction.updatedAt}`} className="bg-[var(--surface)] px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-strong)]">{homeLabel} vs {awayLabel}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{displayDate ?? prediction.matchId}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {t.labels.prediction}: {predictionLabel}
                        {hasFinalScore ? ` • ${t.labels.finalScore}: ${actualScore}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <span className="text-xs font-semibold text-[var(--text-strong)]">{prediction.pointsAwarded} {t.labels.points}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${statusClassByState[status]}`}>
                        <Icon name={statusIconByState[status]} className="text-sm leading-none" />
                        <span>{statusLabel}</span>
                      </span>
                    </div>
                  </div>
                </article>
              )
            }) : (
              <div className="bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">{t.labels.noProfilePredictions}</div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

const ProfileStat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-[var(--surface-soft)] px-3 py-3 text-center">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
    <p className="mt-1 text-lg font-semibold text-[var(--text-strong)]">{value}</p>
  </div>
)
