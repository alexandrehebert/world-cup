import { useLocale } from '../../contexts/locale-context'
import { useDashboard } from '../../contexts/dashboard-context'
import { useTournament } from '../../contexts/tournament-context'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'

export const GroupCard = ({ groupId }: { groupId: string }) => {
  const { t } = useLocale()
  const { isFavoriteTeam, favoriteTeamIds, setSelectedTeamId } = useDashboard()
  const { groupsById, teamsById } = useTournament()
  const group = groupsById[groupId]
  const anyFavoriteInGroup = favoriteTeamIds.length > 0 && group.standings.some((s) => favoriteTeamIds.includes(s.teamId))

  return (
    <div className="bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <h3 className="text-lg font-bold text-[var(--text-strong)]">{t.groups[group.id] ?? group.label}</h3>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-text)]">
          {group.id}
        </div>
      </div>

      <div>
        <div className="grid grid-cols-[1.95fr_repeat(4,minmax(0,0.3fr))_0.45fr] gap-1 border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface-soft)_24%,var(--surface)_76%)] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] sm:grid-cols-[1.55fr_repeat(4,minmax(0,0.4fr))_0.6fr] sm:gap-3 sm:px-5 sm:text-[11px] sm:tracking-[0.22em]">
          <span>{t.labels.standings}</span>
          <span className="text-center">{t.labels.played}</span>
          <span className="text-center">{t.labels.won}</span>
          <span className="text-center">{t.labels.drawn}</span>
          <span className="text-center">{t.labels.lost}</span>
          <span className="text-right">{t.labels.points}</span>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {group.standings.map((standing, index) => {
            const team = teamsById[standing.teamId]
            const isQualifier = index < 2
            const isFavorite = isFavoriteTeam(team.id)

            return (
              <div
                key={standing.teamId}
                className={`grid grid-cols-[1.95fr_repeat(4,minmax(0,0.3fr))_0.45fr] items-center gap-1 px-3 py-3 text-sm transition ${
                  isFavorite
                    ? 'hover:bg-[color:color-mix(in_srgb,var(--accent)_20%,var(--surface)_80%)]'
                    : 'hover:bg-[var(--tab-idle-hover-bg)]'
                } sm:grid-cols-[1.55fr_repeat(4,minmax(0,0.4fr))_0.6fr] sm:gap-3 sm:px-5 ${
                  isFavorite
                    ? (isQualifier ? 'border-l-4 border-l-[var(--accent)]' : 'border-l-4 border-l-[var(--accent)]') + ' bg-[var(--accent-muted)]'
                    : (isQualifier ? 'border-l-2 border-l-[var(--accent)]' : 'border-l-2 border-l-transparent') + (anyFavoriteInGroup ? ' opacity-75' : '')
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedTeamId(team.id)}
                  className="flex cursor-pointer items-center gap-3 text-left"
                >
                  <span className="w-4 text-xs font-semibold text-[var(--text-soft)]">{index + 1}</span>
                  <FlagAvatar team={team} className="h-8 w-8 sm:h-12 sm:w-12" />
                  <div>
                    <p className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-strong)]">
                      <span>{t.teams[team.id] ?? team.name}</span>
                      {isFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                    </p>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{team.code}</p>
                  </div>
                </button>
                <span className="text-center text-[var(--text)]">{standing.played}</span>
                <span className="text-center text-[var(--text)]">{standing.won}</span>
                <span className="text-center text-[var(--text)]">{standing.drawn}</span>
                <span className="text-center text-[var(--text)]">{standing.lost}</span>
                <span className="text-right font-bold text-[var(--text-strong)]">{standing.points}</span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
