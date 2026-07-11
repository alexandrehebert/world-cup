import { useMemo } from 'react'
import { useDashboard } from '../contexts/dashboard-context'
import { useLocale } from '../contexts/locale-context'
import { useTournament } from '../contexts/tournament-context'
import { FlagAvatar } from '../components/ui/flag-avatar'
import type { LocaleCode } from '../types/tournament'

const getOrdinalLabel = (position: number, locale: LocaleCode) => {
  if (locale === 'fr') {
    return position === 1 ? '1er' : `${position}e`
  }

  if (locale === 'es') {
    return `${position}.º`
  }

  if (locale === 'de') {
    return `${position}.`
  }

  const mod10 = position % 10
  const mod100 = position % 100
  if (mod10 === 1 && mod100 !== 11) return `${position}st`
  if (mod10 === 2 && mod100 !== 12) return `${position}nd`
  if (mod10 === 3 && mod100 !== 13) return `${position}rd`
  return `${position}th`
}

export const FinalPhasePage = () => {
  const { locale, t } = useLocale()
  const { setSelectedTeamId, favoriteTeamIds } = useDashboard()
  const { groups, teamsById, matches } = useTournament()
  const [firstGroup, secondGroup] = groups
  const hasPendingGroupMatches = matches.some((match) => match.stage === 'group' && match.status !== 'finished')

  const fixtures = useMemo(() => {
    if (!firstGroup || !secondGroup) {
      return []
    }

    const maxRows = Math.min(firstGroup.standings.length, secondGroup.standings.length)
    return Array.from({ length: maxRows }, (_, index) => {
      const firstStanding = firstGroup.standings[index]
      const secondStanding = secondGroup.standings[index]
      const firstTeam = firstStanding ? teamsById[firstStanding.teamId] : undefined
      const secondTeam = secondStanding ? teamsById[secondStanding.teamId] : undefined

      if (!firstTeam || !secondTeam) {
        return null
      }

      return {
        id: `${firstTeam.id}-${secondTeam.id}-${index}`,
        rank: index + 1,
        title: index === 0 ? t.labels.finalPhaseGrandFinal : `${getOrdinalLabel(index + 1, locale)} ${t.labels.vs} ${getOrdinalLabel(index + 1, locale)}`,
        homeTeam: firstTeam,
        awayTeam: secondTeam,
        homePoints: firstStanding.points,
        awayPoints: secondStanding.points,
        homeConference: t.groups[firstGroup.id] ?? firstGroup.label,
        awayConference: t.groups[secondGroup.id] ?? secondGroup.label,
      }
    }).filter((fixture): fixture is NonNullable<typeof fixture> => fixture !== null)
  }, [firstGroup, secondGroup, locale, t, teamsById])
  const grandFinalFixture = fixtures.find((fixture) => fixture.rank === 1)
  const rankedFixturesDescending = fixtures
    .filter((fixture) => fixture.rank > 1)
    .sort((first, second) => second.rank - first.rank)
  const topDesktopFixtures = rankedFixturesDescending.slice(0, 3)
  const middleDesktopFixtures = rankedFixturesDescending.slice(3)

  const renderFixtureCard = (fixture: (typeof fixtures)[number], options?: { highlight?: boolean }) => {
    const homeIsFavorite = favoriteTeamIds.includes(fixture.homeTeam.id)
    const awayIsFavorite = favoriteTeamIds.includes(fixture.awayTeam.id)
    const highlight = options?.highlight ?? false

    return (
      <div
        key={fixture.id}
        className={`px-4 py-4 ${highlight
          ? 'border-2 border-[var(--text-strong)] bg-[color:color-mix(in_srgb,var(--surface-soft)_72%,var(--surface)_28%)] shadow-[0_12px_28px_rgba(0,0,0,0.24)]'
          : 'border border-[var(--border)] bg-[var(--surface)]'}`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-text)]">{fixture.title}</p>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedTeamId(fixture.homeTeam.id)}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            {hasPendingGroupMatches ? (
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--border)] p-[2px]">
                <FlagAvatar team={fixture.homeTeam} className="h-full w-full opacity-90 saturate-75" />
              </span>
            ) : (
              <FlagAvatar team={fixture.homeTeam} className="h-10 w-10" />
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--text-strong)]">
                {t.teams[fixture.homeTeam.id] ?? fixture.homeTeam.name}
              </span>
              <span className="block text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                {fixture.homeTeam.code}
              </span>
              <span className="block text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                {fixture.homeConference}
              </span>
              <span className="block text-xs text-[var(--text-soft)]">{fixture.homePoints} {t.labels.points}</span>
            </span>
          </button>

          <div className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">{t.labels.vs}</div>

          <button
            type="button"
            onClick={() => setSelectedTeamId(fixture.awayTeam.id)}
            className="flex min-w-0 items-center justify-end gap-3 text-right"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--text-strong)]">
                {t.teams[fixture.awayTeam.id] ?? fixture.awayTeam.name}
              </span>
              <span className="block text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                {fixture.awayTeam.code}
              </span>
              <span className="block text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                {fixture.awayConference}
              </span>
              <span className="block text-xs text-[var(--text-soft)]">{fixture.awayPoints} {t.labels.points}</span>
            </span>
            {hasPendingGroupMatches ? (
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--border)] p-[2px]">
                <FlagAvatar team={fixture.awayTeam} className="h-full w-full opacity-90 saturate-75" />
              </span>
            ) : (
              <FlagAvatar team={fixture.awayTeam} className="h-10 w-10" />
            )}
          </button>
        </div>

        {(homeIsFavorite || awayIsFavorite) ? (
          <div className={`mt-3 pt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-text)] ${highlight ? 'border-t border-[var(--accent-border)]' : 'border-t border-[var(--border)]'}`}>
            {t.labels.favoriteTeams}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.finalPhase}</h2>
      </div>

      {fixtures.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t.labels.comingSoon}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 xl:hidden">
            {fixtures.map((fixture) => renderFixtureCard(fixture, { highlight: fixture.rank === 1 }))}
          </div>

          <div className="hidden gap-3 xl:grid xl:grid-cols-3 xl:items-center">
            <div className="flex flex-col gap-3">
              {topDesktopFixtures.map((fixture) => renderFixtureCard(fixture))}
            </div>

            <div className="flex flex-col gap-3">
              {middleDesktopFixtures.map((fixture) => renderFixtureCard(fixture))}
            </div>

            <div className="flex flex-col gap-3">
              {grandFinalFixture ? renderFixtureCard(grandFinalFixture, { highlight: true }) : null}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
