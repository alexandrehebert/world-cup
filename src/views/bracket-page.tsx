import { useMemo, useState } from 'react'
import { useLocale } from '../contexts/locale-context'
import { useTournament } from '../contexts/tournament-context'
import { BracketBoard } from '../components/bracket/bracket-board'

type BracketViewMode = 'detailed' | 'condensed'

export const BracketPage = () => {
  const { t } = useLocale()
  const { bracketRounds, teams } = useTournament()
  const [forecastTeamId, setForecastTeamId] = useState<string>('')
  const [viewMode, setViewMode] = useState<BracketViewMode>('detailed')
  const sortedTeams = useMemo(
    () =>
      [...teams].sort((first, second) =>
        (t.teams[first.id] ?? first.name).localeCompare(t.teams[second.id] ?? second.name),
      ),
    [t, teams],
  )

  return (
    <section className="space-y-4 pb-4">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.bracket}</h2>
      </div>
      <div className="space-y-2 border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="space-y-2 border-b border-[var(--border)] pb-3">
          <p className="text-sm font-semibold text-[var(--text-strong)]">{t.labels.bracketViewMode}</p>
          <div className="inline-flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-1">
            <button
              type="button"
              className={`inline-flex h-10 items-center justify-center border px-3 text-sm font-semibold transition ${
                viewMode === 'detailed'
                  ? 'border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent-text)]'
                  : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]'
              }`}
              onClick={() => setViewMode('detailed')}
            >
              {t.labels.bracketViewDetailed}
            </button>
            <button
              type="button"
              className={`inline-flex h-10 items-center justify-center border px-3 text-sm font-semibold transition ${
                viewMode === 'condensed'
                  ? 'border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent-text)]'
                  : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]'
              }`}
              onClick={() => setViewMode('condensed')}
            >
              {t.labels.bracketViewCondensed}
            </button>
          </div>
        </div>

        <label className="block text-sm font-semibold text-[var(--text-strong)]" htmlFor="bracket-path-team-select">
          {t.labels.bracketPathTeam}
        </label>
        <p className="text-xs text-[var(--text-soft)]">{t.labels.bracketPathHint}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id="bracket-path-team-select"
            value={forecastTeamId}
            onChange={(event) => setForecastTeamId(event.target.value)}
            className="h-10 min-w-0 flex-1 border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--text-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <option value="">{t.labels.team}</option>
            {sortedTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {t.teams[team.id] ?? team.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setForecastTeamId('')}
            disabled={forecastTeamId.length === 0}
          >
            {t.labels.clearBracketPath}
          </button>
        </div>
      </div>
      <BracketBoard rounds={bracketRounds} forecastTeamId={forecastTeamId || undefined} viewMode={viewMode} />
    </section>
  )
}
