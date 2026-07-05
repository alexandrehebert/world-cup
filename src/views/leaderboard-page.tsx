import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeaderboardBootstrap } from '../contexts/leaderboard-context'
import { useLocale } from '../contexts/locale-context'
import { Icon } from '../lib/icons'
import { useShareLink } from '../lib/use-share-link'
import type { LeaderboardEntry } from '../types/predictions'
import type { RankedLeaderboardEntry } from '../types/bootstrap'

type LeaderboardResponse = {
  leaderboard: Array<LeaderboardEntry & { rank: number }>
}

export const LeaderboardPage = () => {
  const { t } = useLocale()
  const { initialEntries } = useLeaderboardBootstrap()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<RankedLeaderboardEntry[]>(initialEntries)
  const { isCopied, share } = useShareLink('/leaderboard')
  const actionButtonClassName = 'appearance-none inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold leading-normal text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)] sm:w-auto sm:justify-start sm:gap-2 sm:px-3 sm:py-2'

  useEffect(() => {
    if (initialEntries.length > 0) {
      return
    }

    const loadLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard?limit=100', {
          method: 'GET',
          cache: 'no-store',
        })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as LeaderboardResponse
        setEntries(payload.leaderboard)
      } catch {
        setEntries([])
      }
    }

    void loadLeaderboard()
  }, [initialEntries.length])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.leaderboard}</h2>
        <button
          type="button"
          onClick={() => void share()}
          className={`cursor-pointer ${actionButtonClassName}`}
          aria-label={isCopied ? t.labels.copied : t.labels.shareLeaderboard}
        >
          <Icon name={isCopied ? 'check' : 'share'} className="text-[20px] leading-none sm:text-[18px]" />
          <span className="hidden sm:inline">{isCopied ? t.labels.copied : t.labels.shareLeaderboard}</span>
        </button>
      </div>

      <div className="overflow-x-auto bg-[var(--surface)]">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">{t.labels.player}</th>
              <th className="px-4 py-3">{t.labels.points}</th>
              <th className="px-4 py-3">{t.labels.predictions}</th>
            </tr>
          </thead>
          <tbody>
            {entries.length > 0 ? (
              entries.map((entry) => (
                <tr
                  key={entry.userId}
                  tabIndex={0}
                  role="button"
                  aria-label={`${t.labels.viewProfile}: ${entry.username}`}
                  onClick={() => navigate(`/profile/${encodeURIComponent(entry.username)}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/profile/${encodeURIComponent(entry.username)}`)
                    }
                  }}
                  className="border-b border-[var(--border)] text-[var(--text)] transition hover:bg-[var(--surface-soft)] focus-visible:bg-[var(--surface-soft)] focus-visible:outline-none last:border-b-0"
                >
                  <td className="px-4 py-3">{entry.rank}</td>
                  <td className="px-4 py-3 font-semibold text-[var(--accent-text)]">{entry.username}</td>
                  <td className="px-4 py-3">{entry.points}</td>
                  <td className="px-4 py-3">{entry.predictionsCount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-4 text-[var(--text-muted)]" colSpan={4}>
                  {t.labels.noRankedPlayersYet}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
