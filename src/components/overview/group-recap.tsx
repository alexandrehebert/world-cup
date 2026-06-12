import { useTournament } from '../../contexts/tournament-context'
import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'

export const GroupRecap = () => {
  const { t } = useLocale()
  const { isFavoriteTeam } = useDashboard()
  const { groups, teamsById } = useTournament()

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map((group) => {
        const topTeams = group.standings.slice(0, 2)

        return (
          <div key={group.id} className="bg-[var(--surface)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
              <h3 className="text-sm font-semibold text-[var(--text-strong)]">
                {t.groups[group.id] ?? group.label}
              </h3>
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-text)]">
                {group.id}
              </span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {topTeams.map((standing, index) => {
                const team = teamsById[standing.teamId]
                const isFavorite = isFavoriteTeam(team.id)

                return (
                  <div key={standing.teamId} className={`flex items-center justify-between gap-3 border-l-2 border-l-[var(--accent)] px-5 py-3 transition hover:bg-[var(--accent-muted)] ${isFavorite ? 'bg-[var(--accent-muted)]' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-4 text-xs font-semibold text-[var(--text-soft)]">{index + 1}</span>
                      <FlagAvatar team={team} />
                      <div>
                        <p className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-strong)]">
                          <span>{t.teams[team.id] ?? team.name}</span>
                          {isFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                        </p>
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{team.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[var(--text-strong)]">{standing.points}</p>
                      <p className="text-xs text-[var(--text-soft)]">
                        {standing.played}·{standing.won}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
