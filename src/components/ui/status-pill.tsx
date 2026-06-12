import type { ReactNode } from 'react'
import type { MatchRecord } from '../../types/tournament'

const statusClasses: Record<MatchRecord['status'], string> = {
  scheduled: 'text-[var(--text-soft)]',
  live: 'bg-[var(--surface-strong)] text-[var(--text-soft)]',
  finished: 'text-[var(--text-soft)]',
}

export const StatusPill = ({ status, label }: { status: MatchRecord['status']; label: ReactNode }) => (
  <span
    className={`inline-flex text-[11px] font-semibold uppercase tracking-[0.2em] ${statusClasses[status]}`}
  >
    {label}
  </span>
)
