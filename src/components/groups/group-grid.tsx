import { useTournament } from '../../contexts/tournament-context'
import { GroupCard } from './group-card'

export const GroupGrid = () => {
  const { groups } = useTournament()

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map((group) => (
        <GroupCard key={group.id} groupId={group.id} />
      ))}
    </div>
  )
}
