import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useLocale } from '../../contexts/locale-context'
import { useTournament } from '../../contexts/tournament-context'
import { resolveCompetitionId } from '../../competitions'
import { getCompetitionBallIconNameById } from '../../lib/competition-branding'
import { getStandingsSectionPath, usesFinalPhaseSectionPath, usesStandingsSectionPath } from '../../lib/competition-sections'
import { Icon } from '../../lib/icons'
import { isAccountFeatureEnabled, isPredictionsFeatureEnabled } from '../../lib/features'
import { hasBracketSection, hasFinalPhaseSection, hasGroupsSection } from '../../lib/tournament-sections'
import { AuthModal } from '../auth/auth-modal'
import { MatchModal } from '../matches/match-modal'
import { CountryModal } from '../teams/country-modal'
import { Footer } from './footer'

const HEADER_COMPACT_ENTER_SCROLL = 56
const HEADER_COMPACT_EXIT_SCROLL = 24
const HEADER_COMPACT_SETTLE_MS = 120

const baseTabs = [
  { to: '/', labelKey: 'dashboard', icon: 'home', iconClassName: '' },
  { to: '/agenda', labelKey: 'agenda', icon: 'calendar_month', iconClassName: '' },
  { to: '/groups', sectionId: 'groups', labelKey: 'groups', icon: 'groups', iconClassName: '' },
  { to: '/teams', labelKey: 'teams', icon: 'flag', iconClassName: '' },
  { to: '/stadiums', labelKey: 'stadiums', icon: 'stadium', iconClassName: '' },
  { to: '/matches', labelKey: 'matches', icon: 'stadium', iconClassName: '' },
  { to: '/final-phase', sectionId: 'finalPhase', labelKey: 'finalPhase', icon: 'emoji_events', iconClassName: '' },
  { to: '/bracket', labelKey: 'bracket', icon: 'account_tree', iconClassName: '-scale-x-100' },
  { to: '/predictions', labelKey: 'predictions', icon: 'edit_note', iconClassName: '' },
] as const

export const DashboardLayout = ({ header }: { header: ReactNode }) => {
  const { t } = useLocale()
  const location = useLocation()
  const { meta, groups, bracketRounds } = useTournament()
  const competitionId = resolveCompetitionId(meta.competitionId)
  const hasGroups = hasGroupsSection(groups)
  const hasBracket = hasBracketSection(bracketRounds)
  const hasFinalPhase = usesFinalPhaseSectionPath(competitionId) && hasFinalPhaseSection(groups)
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
    .filter((tab) => (
      'sectionId' in tab
        ? tab.sectionId === 'groups'
          ? hasGroups
          : tab.sectionId === 'finalPhase'
            ? hasFinalPhase
            : true
        : tab.to === '/bracket'
          ? hasBracket
          : true
    ))
  const [isHeaderCompact, setIsHeaderCompact] = useState(false)
  const headerScrollTimeoutRef = useRef<number | null>(null)
  const isStadiumsRoute = location.pathname === '/stadiums'

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
    <div className={`relative bg-[var(--bg)] text-[var(--text)] ${isStadiumsRoute ? 'min-h-screen lg:h-screen lg:overflow-hidden' : 'min-h-screen'}`}>
      <div className={`mx-auto flex w-full max-w-[1600px] flex-col px-4 sm:px-6 lg:px-8 xl:px-10 ${isStadiumsRoute ? 'lg:h-full' : ''}`}>
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
                end={tab.to === '/'}
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
              <span className={tab.to === '/' ? 'sr-only' : 'hidden sm:inline'}>
                  {useStandingsPath && 'sectionId' in tab && tab.sectionId === 'groups' ? t.labels.standings : t.sections[tab.labelKey]}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <main className={`min-w-0 py-6 ${isStadiumsRoute ? 'lg:flex-1 lg:min-h-0 lg:overflow-hidden lg:flex lg:flex-col' : ''}`}>
          <Outlet />
        </main>

        {isStadiumsRoute ? <div className="lg:hidden"><Footer /></div> : <Footer />}
      </div>

      {isAccountFeatureEnabled ? <AuthModal /> : null}
      <MatchModal />
      <CountryModal />
    </div>
  )
}
