import { useTournament } from '../../contexts/tournament-context'

export const OverviewPanel = () => {
  const tournament = useTournament()

  return (
    <div className="border-b border-[var(--border)] py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-4">
          <h2 className="text-3xl font-bold tracking-[-0.04em] text-[var(--text-strong)] sm:text-4xl">
            {tournament.meta.edition}
          </h2>
        </div>
      </div>
    </div>
  )
}
