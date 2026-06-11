import type { TeamRecord } from '../../types/tournament'

export const FlagAvatar = ({ team, className = '' }: { team: TeamRecord; className?: string }) => {
  const sizeClassName = className.trim() ? className : 'h-12 w-12'

  return (
    <div
      aria-hidden="true"
      className={`shrink-0 flex ${sizeClassName} items-center justify-center overflow-hidden rounded-full border border-[var(--border)]`}
    >
      <span
        className={`fi fi-${team.flagCode} flag-avatar-fill block h-full w-full`}
        title={team.code}
      />
    </div>
  )
}
