import { useLocale } from '../contexts/locale-context'
import { useTournament } from '../contexts/tournament-context'
import { BracketBoard } from '../components/bracket/bracket-board'

export const BracketPage = () => {
  const { t } = useLocale()
  const { bracketRounds } = useTournament()

  return (
    <section className="space-y-4 pb-4">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.bracket}</h2>
      </div>
      <BracketBoard rounds={bracketRounds} />
    </section>
  )
}
