import type { MatchRecord } from '../../types/tournament'

const statusClasses: Record<MatchRecord['status'], string> = {
  scheduled: 'text-[var(--text-soft)]',
  live: 'bg-[var(--accent-muted)] text-[var(--accent-text)]',
  finished: 'text-[var(--text-soft)]',
}

export const StatusPill = ({ status, label }: { status: MatchRecord['status']; label: string }) => (
  <span
    className={`inline-flex px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${statusClasses[status]}`}
  >
    {label}
  </span>
)
