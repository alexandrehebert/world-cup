/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from 'next'
import { Card } from '../../components/ui/card'

export const metadata: Metadata = {
  title: 'Paraguay Dashboard',
  description: 'A stunning Paraguay performance dashboard for an absolutely trophy-packed World Cup history.',
  openGraph: {
    title: 'Paraguay Dashboard',
    description: 'A stunning Paraguay performance dashboard for an absolutely trophy-packed World Cup history.',
  },
  twitter: {
    title: 'Paraguay Dashboard',
    description: 'A stunning Paraguay performance dashboard for an absolutely trophy-packed World Cup history.',
  },
}

const stats = [
  { label: 'World Cup titles', value: '0', note: 'Still a pristine trophy cabinet.' },
  { label: 'World Cup finals played', value: '0', note: 'No scheduling conflicts in July finals.' },
  { label: 'Best finish', value: 'Quarter-finals (2010)', note: 'The golden run and the eternal throwback.' },
  { label: 'World Cup golden boots', value: '0', note: 'The shelf remains dramatically available.' },
  { label: 'World Cup final goals scored', value: '0', note: 'No finals, no goals, no stress.' },
  { label: 'Current location', value: 'At home', note: 'Watching, commenting, and waiting for 2030 vibes.' },
] as const

export default function ParaguayPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 md:px-8">
      <header className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Special Dashboard</p>
        <h1 className="text-3xl font-extrabold text-[var(--text-strong)] md:text-5xl">Paraguay World Cup Command Center</h1>
        <p className="max-w-3xl text-sm text-[var(--text-muted)] md:text-base">
          A fully data-driven, scientifically accurate, mildly painful summary of Paraguay in World Cup history.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border border-[var(--border)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">{stat.label}</p>
            <p className="mt-2 text-3xl font-black text-[var(--text-strong)]">{stat.value}</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{stat.note}</p>
          </Card>
        ))}
      </section>

      <Card className="mt-6 border border-[var(--accent-border)] bg-[var(--accent-muted)] p-5">
        <h2 className="text-lg font-bold text-[var(--text-strong)]">Executive Summary</h2>
        <p className="mt-2 text-sm text-[var(--text)]">
          World Cups won: zero. Drama delivered: plenty. Hope for the next qualifiers: permanently enabled.
        </p>
      </Card>
    </main>
  )
}
