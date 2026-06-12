import { cloneElement, isValidElement, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useLocale } from '../../contexts/locale-context'
import { Icon } from '../../lib/icons'
import { MatchModal } from '../matches/match-modal'
import { Footer } from './footer'

const tabs = [
  { to: '/overview', labelKey: 'overview', icon: 'calendar_month', iconClassName: '' },
  { to: '/groups', labelKey: 'groups', icon: 'groups', iconClassName: '' },
  { to: '/matches', labelKey: 'matches', icon: 'sports_soccer', iconClassName: '' },
  { to: '/bracket', labelKey: 'bracket', icon: 'account_tree', iconClassName: '-scale-x-100' },
] as const

export const DashboardLayout = ({ header }: { header: ReactNode }) => {
  const { t } = useLocale()
  const [isHeaderCompact, setIsHeaderCompact] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setIsHeaderCompact(window.scrollY > 40)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const renderedHeader = isValidElement<{ isCompact?: boolean }>(header)
    ? cloneElement(header, { isCompact: isHeaderCompact })
    : header

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="sticky top-0 z-30 bg-[color:color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur">
          {renderedHeader}

          <nav
            className="flex flex-wrap border-b border-[var(--border)]"
            aria-label="Primary"
          >
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                aria-label={t.sections[tab.labelKey]}
                className={({ isActive }) =>
                  `-mb-px inline-flex items-center justify-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition sm:px-5 ${
                    isActive
                      ? 'border-[var(--accent)] text-[var(--accent-text)]'
                      : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
                  }`
                }
              >
                <span className="inline-flex items-center gap-1">
                  {(Array.isArray(tab.icon) ? tab.icon : [tab.icon]).map((iconName) => (
                    <Icon key={iconName} name={iconName} className={`text-[18px] ${tab.iconClassName ?? ''}`.trim()} />
                  ))}
                </span>
                <span className="hidden sm:inline">{t.sections[tab.labelKey]}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <main className="min-w-0 py-6">
          <Outlet />
        </main>

        <Footer />
      </div>

      <MatchModal />
    </div>
  )
}
