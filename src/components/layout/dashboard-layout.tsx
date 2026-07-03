import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useLocale } from '../../contexts/locale-context'
import { useTournament } from '../../contexts/tournament-context'
import { resolveCompetitionId } from '../../competitions'
import { getCompetitionBallIconNameById } from '../../lib/competition-branding'
import { getStandingsSectionPath, usesStandingsSectionPath } from '../../lib/competition-sections'
import { Icon } from '../../lib/icons'
import { isPredictionsFeatureEnabled } from '../../lib/features'
import { hasBracketSection, hasGroupsSection } from '../../lib/tournament-sections'
import { AuthModal } from '../auth/auth-modal'
import { MatchModal } from '../matches/match-modal'
import { CountryModal } from '../teams/country-modal'
import { Footer } from './footer'

const HEADER_COMPACT_ENTER_SCROLL = 56
const HEADER_COMPACT_EXIT_SCROLL = 24
const HEADER_COMPACT_SETTLE_MS = 120

const baseTabs = [
  { to: '/overview', labelKey: 'overview', icon: 'calendar_month', iconClassName: '' },
  { to: '/groups', sectionId: 'groups', labelKey: 'groups', icon: 'groups', iconClassName: '' },
  { to: '/teams', labelKey: 'teams', icon: 'flag', iconClassName: '' },
  { to: '/matches', labelKey: 'matches', icon: 'sports_soccer', iconClassName: '' },
  { to: '/bracket', labelKey: 'bracket', icon: 'account_tree', iconClassName: '-scale-x-100' },
  { to: '/predictions', labelKey: 'predictions', icon: 'edit_note', iconClassName: '' },
] as const

export const DashboardLayout = ({ header }: { header: ReactNode }) => {
  const { t } = useLocale()
  const { meta, groups, bracketRounds } = useTournament()
  const competitionId = resolveCompetitionId(meta.competitionId)
  const hasGroups = hasGroupsSection(groups)
  const hasBracket = hasBracketSection(bracketRounds)
  const groupsSectionPath = getStandingsSectionPath(competitionId)
  const useStandingsPath = usesStandingsSectionPath(competitionId)
  const matchesIconName = getCompetitionBallIconNameById(competitionId)
  const tabs = baseTabs.map((tab) => {
    if (tab.to === '/matches') {
      return { ...tab, icon: matchesIconName }
    }

    if ('sectionId' in tab && tab.sectionId === 'groups') {
      return { ...tab, to: groupsSectionPath }
    }

    return tab
  })
  const navigationTabs = (isPredictionsFeatureEnabled ? tabs : tabs.filter((tab) => tab.to !== '/predictions'))
    .filter((tab) => ('sectionId' in tab && tab.sectionId === 'groups' ? hasGroups : tab.to === '/bracket' ? hasBracket : true))
  const [isHeaderCompact, setIsHeaderCompact] = useState(false)
  const headerScrollTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const updateHeaderMode = () => {
      const scrollPosition = window.scrollY

      setIsHeaderCompact((currentIsCompact) => {
        if (currentIsCompact) {
          return scrollPosition > HEADER_COMPACT_EXIT_SCROLL
        }

        return scrollPosition > HEADER_COMPACT_ENTER_SCROLL
      })
    }

    const onScroll = () => {
      if (headerScrollTimeoutRef.current !== null) {
        window.clearTimeout(headerScrollTimeoutRef.current)
      }

      headerScrollTimeoutRef.current = window.setTimeout(() => {
        updateHeaderMode()
        headerScrollTimeoutRef.current = null
      }, HEADER_COMPACT_SETTLE_MS)
    }

    updateHeaderMode()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)

      if (headerScrollTimeoutRef.current !== null) {
        window.clearTimeout(headerScrollTimeoutRef.current)
        headerScrollTimeoutRef.current = null
      }
    }
  }, [])

  const renderedHeader = isValidElement<{ isCompact?: boolean }>(header)
    ? cloneElement(header, { isCompact: isHeaderCompact })
    : header

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="sticky top-0 z-30 bg-[var(--bg)]" style={{ overflowAnchor: 'none' }}>
          {renderedHeader}

          <nav
            className="flex flex-wrap justify-center border-b border-[var(--border)] sm:justify-start"
            aria-label="Primary"
          >
            {navigationTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                aria-label={useStandingsPath && 'sectionId' in tab && tab.sectionId === 'groups' ? t.labels.standings : t.sections[tab.labelKey]}
                className={({ isActive }) =>
                  `-mb-px inline-flex cursor-pointer items-center justify-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition sm:px-5 ${
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
                <span className="hidden sm:inline">
                  {useStandingsPath && 'sectionId' in tab && tab.sectionId === 'groups' ? t.labels.standings : t.sections[tab.labelKey]}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <main className="min-w-0 py-6">
          <Outlet />
        </main>

        <Footer />
      </div>

      <AuthModal />
      <MatchModal />
      <CountryModal />
    </div>
  )
}
