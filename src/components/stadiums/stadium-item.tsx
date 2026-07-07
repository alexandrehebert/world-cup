import { getStadiumBackgroundGradient } from '../../lib/stadium-images'
import type { StadiumSummary } from '../../lib/stadiums'

interface StadiumItemProps {
  stadium: StadiumSummary
  isSelected: boolean
  onClick: () => void
  labels: {
    stadiumLocation: string
    stadiumSeatCapacity: string
    opened: string
    stadiumTimeZone: string
    matchesHosted: string
    firstKickoff: string
    lastKickoff: string
    unknown: string
    seats: string
  }
  numberFormatter: Intl.NumberFormat
  firstKickoffLabel: string
  lastKickoffLabel: string
}

export const StadiumItem = ({
  stadium,
  isSelected,
  onClick,
  labels,
  numberFormatter,
  firstKickoffLabel,
  lastKickoffLabel,
}: StadiumItemProps) => {
  const seatCapacityLabel = stadium.seatCapacity
    ? `${numberFormatter.format(stadium.seatCapacity)} ${labels.seats}`
    : labels.unknown
  const openedYearLabel = stadium.openedYear ? String(stadium.openedYear) : labels.unknown
  const gradientBg = getStadiumBackgroundGradient(stadium.key)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col border bg-[var(--surface)] overflow-hidden rounded-[var(--radius-sm)] transition ${
        isSelected
          ? 'border-[var(--accent-border)]'
          : 'border-[var(--border)] hover:bg-[var(--surface-soft)]'
      }`}
    >
      {/* Header with Gradient Background */}
      <div
        className="border-b border-[var(--border)] px-4 py-3"
        style={{
          backgroundImage: gradientBg,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="min-w-0 text-left">
          <h3 className="truncate text-base font-semibold text-[var(--text-strong)]">
            {stadium.stadium}
          </h3>
          <p className="truncate text-xs text-[var(--text-soft)]">
            {stadium.city}, {stadium.country}
          </p>
        </div>
      </div>

      {/* Details */}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 px-4 py-3 text-sm text-left">
        <dt className="text-[var(--text-soft)]">{labels.stadiumLocation}</dt>
        <dd className="text-[var(--text-strong)]">
          {stadium.city}, {stadium.country}
        </dd>

        <dt className="text-[var(--text-soft)]">{labels.stadiumSeatCapacity}</dt>
        <dd className="text-[var(--text-strong)]">{seatCapacityLabel}</dd>

        <dt className="text-[var(--text-soft)]">{labels.opened}</dt>
        <dd className="text-[var(--text-strong)]">{openedYearLabel}</dd>

        <dt className="text-[var(--text-soft)]">{labels.stadiumTimeZone}</dt>
        <dd className="text-[var(--text-strong)]">{stadium.timeZone || labels.unknown}</dd>

        <dt className="text-[var(--text-soft)]">{labels.matchesHosted}</dt>
        <dd className="text-[var(--text-strong)]">{numberFormatter.format(stadium.matchesHosted)}</dd>

        <dt className="text-[var(--text-soft)]">{labels.firstKickoff}</dt>
        <dd className="text-[var(--text-strong)]">{firstKickoffLabel}</dd>

        <dt className="text-[var(--text-soft)]">{labels.lastKickoff}</dt>
        <dd className="text-[var(--text-strong)]">{lastKickoffLabel}</dd>
      </dl>
    </button>
  )
}
