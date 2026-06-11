import { useLocale } from '../contexts/locale-context'
import { useTournament } from '../contexts/tournament-context'
import { UpcomingMatches } from '../components/matches/upcoming-matches'
import { GroupRecap } from '../components/overview/group-recap'

export const OverviewPage = () => {
  const { t } = useLocale()
  const { upcomingMatches } = useTournament()

  return (
    <section className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.upcomingMatches}</h2>
        <UpcomingMatches matches={upcomingMatches} compact />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.groups}</h2>
        <GroupRecap />
      </section>
    </section>
  )
}
