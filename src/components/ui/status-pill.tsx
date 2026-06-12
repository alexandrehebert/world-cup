import type { ReactNode } from 'react'
import type { MatchRecord } from '../../types/tournament'

const statusClasses: Record<MatchRecord['status'], string> = {
  scheduled: 'text-[var(--text-soft)]',
  live: 'bg-[var(--surface-strong)] text-[var(--text-soft)]',
  finished: 'text-[var(--text-soft)]',
}

export const StatusPill = ({
  status,
  label,
  className = '',
}: {
  status: MatchRecord['status'];
  label: ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-flex text-[11px] font-semibold uppercase tracking-[0.2em] ${statusClasses[status]} ${className}`.trim()}
  >
    {label}
  </span>
)
