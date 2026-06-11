import { useLocale } from '../../contexts/locale-context'
import { useTournament } from '../../contexts/tournament-context'
import { getLocalizedText } from '../../lib/format'
import { FlagAvatar } from '../ui/flag-avatar'

export const GroupCard = ({ groupId }: { groupId: string }) => {
  const { locale, t } = useLocale()
  const { groupsById, teamsById } = useTournament()
  const group = groupsById[groupId]

  return (
    <div className="bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <h3 className="text-lg font-bold text-[var(--text-strong)]">{getLocalizedText(group.label, locale)}</h3>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-text)]">
          {group.id}
        </div>
      </div>

      <div>
        <div className="grid grid-cols-[1.55fr_repeat(4,minmax(0,0.4fr))_0.6fr] gap-3 border-b border-[var(--border)] bg-[var(--surface-soft)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
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

            return (
              <div
                key={standing.teamId}
                className={`grid grid-cols-[1.55fr_repeat(4,minmax(0,0.4fr))_0.6fr] items-center gap-3 px-5 py-3 text-sm transition hover:bg-[var(--accent-muted)] ${isQualifier ? 'border-l-2 border-l-[var(--accent)]' : 'border-l-2 border-l-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-4 text-xs font-semibold text-[var(--text-soft)]">{index + 1}</span>
                  <FlagAvatar team={team} />
                  <div>
                    <p className="font-semibold text-[var(--text-strong)]">{getLocalizedText(team.name, locale)}</p>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">{team.code}</p>
                  </div>
                </div>
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
