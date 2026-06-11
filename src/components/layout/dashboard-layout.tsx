import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useLocale } from '../../contexts/locale-context'
import { MatchModal } from '../matches/match-modal'

const tabs = [
  { to: '/overview', labelKey: 'overview' },
  { to: '/groups', labelKey: 'groups' },
  { to: '/matches', labelKey: 'matches' },
  { to: '/bracket', labelKey: 'bracket' },
] as const

export const DashboardLayout = ({ header }: { header: ReactNode }) => {
  const { t } = useLocale()

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 sm:px-6 lg:px-8 xl:px-10">
        {header}

        <nav
          className="sticky top-0 z-20 flex flex-wrap border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur"
          aria-label="Primary"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `-mb-px border-b-2 px-5 py-4 text-sm font-semibold transition ${
                  isActive
                    ? 'border-[var(--accent)] text-[var(--accent-text)]'
                    : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
                }`
              }
            >
              {t.sections[tab.labelKey]}
            </NavLink>
          ))}
        </nav>

        <main className="min-w-0 py-6">
          <Outlet />
        </main>
      </div>

      <MatchModal />
    </div>
  )
}
