import { useLocale } from '../contexts/locale-context'
import { GroupGrid } from '../components/groups/group-grid'

export const GroupsPage = () => {
  const { t } = useLocale()

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.headings.groups}</h2>
      </div>
      <GroupGrid />
    </section>
  )
}
