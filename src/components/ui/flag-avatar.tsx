import type { TeamRecord } from '../../types/tournament'

export const FlagAvatar = ({ team, className = '' }: { team: TeamRecord; className?: string }) => {
  const sizeClassName = className.trim() ? className : 'h-12 w-12'

  return (
    <div
      aria-hidden="true"
      className={`relative shrink-0 ${sizeClassName} overflow-hidden rounded-full border border-[var(--border)]`}
    >
      <span
        className={`fi fi-${team.flagCode} flag-avatar-circle-fill`}
        title={team.code}
      />
    </div>
  )
}
