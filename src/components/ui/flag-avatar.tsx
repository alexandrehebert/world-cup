import type { TeamRecord } from '../../types/tournament'

export const FlagAvatar = ({ team }: { team: TeamRecord }) => {
  return (
    <div
      aria-hidden="true"
      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[var(--border)]"
    >
      <span
        className={`fi fi-${team.flagCode} flag-avatar-fill block h-full w-full`}
        title={team.code}
      />
    </div>
  )
}
