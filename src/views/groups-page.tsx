import { useLocale } from '../contexts/locale-context'
import { useTournament } from '../contexts/tournament-context'
import { resolveCompetitionId } from '../competitions'
import { usesStandingsSectionPath } from '../lib/competition-sections'
import { GroupGrid } from '../components/groups/group-grid'

export const GroupsPage = () => {
  const { t } = useLocale()
  const { meta } = useTournament()
  const competitionId = resolveCompetitionId(meta.competitionId)
  const heading = usesStandingsSectionPath(competitionId) ? t.labels.standings : t.headings.groups

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{heading}</h2>
      </div>
      <GroupGrid />
    </section>
  )
}
