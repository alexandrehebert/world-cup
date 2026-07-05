import { useMemo } from 'react'
import { listCompetitionProfiles, parseCompetitionId } from '../../competitions'
import type { CompetitionId } from '../../competitions/types'
import { useLocale } from '../../contexts/locale-context'
import {
  buildCompetitionSwitcherPath,
  buildCompetitionYearFragment,
  getCompetitionFamilyLabel,
  getCompetitionSeasonDetails,
} from '../../lib/competition-navigation'

const LOCAL_SWITCH_URL_BY_ID: Record<CompetitionId, string> = {
  'world-cup-2026': 'http://localhost:3001',
  'nations-championship-2026': 'http://localhost:3002',
  'six-nations-championship-2025': 'http://localhost:3003',
  'six-nations-championship-2026': 'http://localhost:3003',
}

const configuredSiteUrlById: Partial<Record<CompetitionId, string | undefined>> = {
  'world-cup-2026': process.env.NEXT_PUBLIC_WORLD_CUP_SITE_URL,
  'nations-championship-2026': process.env.NEXT_PUBLIC_NATIONS_CHAMPIONSHIP_SITE_URL,
  'six-nations-championship-2025': process.env.NEXT_PUBLIC_SIX_NATIONS_CHAMPIONSHIP_SITE_URL,
  'six-nations-championship-2026': process.env.NEXT_PUBLIC_SIX_NATIONS_CHAMPIONSHIP_SITE_URL,
}

const toBaseUrl = (value: string | undefined) => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (!URL.canParse(trimmed)) {
    return null
  }

  const parsed = new URL(trimmed)
  const normalizedPath = parsed.pathname.replace(/\/+$/, '')
  return `${parsed.protocol}//${parsed.host}${normalizedPath}`
}

const isLocalOrigin = (origin: string | null) => {
  if (!origin) {
    return false
  }

  try {
    const parsed = new URL(origin)
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

const getCurrentOrigin = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.location.origin
}

const resolveCompetitionUrl = (
  competitionId: CompetitionId,
  activeCompetitionId: string | undefined,
  currentOrigin: string | null,
  mostRecentYearByFamily: Readonly<Record<string, number | undefined>>,
) => {
  const targetFamilyId = getCompetitionSeasonDetails(competitionId).familyId
  const normalizedActiveCompetitionId = parseCompetitionId(activeCompetitionId)
  const activeFamilyId = activeCompetitionId
    ? normalizedActiveCompetitionId
      ? getCompetitionSeasonDetails(normalizedActiveCompetitionId).familyId
      : undefined
    : undefined
  const yearFragment = buildCompetitionYearFragment(competitionId, mostRecentYearByFamily)
  const competitionPath = buildCompetitionSwitcherPath(yearFragment)

  if (currentOrigin && activeCompetitionId && targetFamilyId === activeFamilyId) {
    return `${currentOrigin}${competitionPath}`
  }

  const configuredUrl = toBaseUrl(configuredSiteUrlById[competitionId])
  if (configuredUrl) {
    return `${configuredUrl}${competitionPath}`
  }

  if (isLocalOrigin(currentOrigin)) {
    return `${LOCAL_SWITCH_URL_BY_ID[competitionId]}${competitionPath}`
  }

  if (activeCompetitionId === competitionId && currentOrigin) {
    return `${currentOrigin}${competitionPath}`
  }

  return null
}

export const CompetitionSwitcher = ({ activeCompetitionId }: { activeCompetitionId?: string }) => {
  const { t } = useLocale()
  const currentOrigin = getCurrentOrigin()

  const groupedOptions = useMemo(() => {
    const allCompetitions = listCompetitionProfiles()
    const mostRecentYearByFamily = allCompetitions.reduce<Record<string, number | undefined>>((accumulator, competition) => {
      const { familyId, year } = getCompetitionSeasonDetails(competition.id)

      if (year === null) {
        return accumulator
      }

      const currentMostRecentYear = accumulator[familyId]
      accumulator[familyId] = currentMostRecentYear === undefined ? year : Math.max(currentMostRecentYear, year)

      return accumulator
    }, {})
    const groupedBySport = new Map<
      string,
      {
        sportLabel: string
        options: {
          familyId: string
          familyLabel: string
          entries: { id: CompetitionId; label: string; year: number | null; href: string | null }[]
        }[]
      }
    >()

    for (const competition of allCompetitions) {
      if (activeCompetitionId === competition.id) {
        continue
      }

      const sportKey = competition.sportLabel
      const existingGroup = groupedBySport.get(sportKey)
      const { familyId, year } = getCompetitionSeasonDetails(competition.id)
      const familyLabel = getCompetitionFamilyLabel(competition.displayName)
      const optionEntry = {
        id: competition.id,
        label: competition.displayName,
        year,
        href: resolveCompetitionUrl(competition.id, activeCompetitionId, currentOrigin, mostRecentYearByFamily),
      }

      if (existingGroup) {
        const existingOption = existingGroup.options.find((option) => option.familyId === familyId)

        if (existingOption) {
          existingOption.entries.push(optionEntry)
        } else {
          existingGroup.options.push({
            familyId,
            familyLabel,
            entries: [optionEntry],
          })
        }
      } else {
        groupedBySport.set(sportKey, {
          sportLabel: competition.sportLabel,
          options: [{
            familyId,
            familyLabel,
            entries: [optionEntry],
          }],
        })
      }
    }

    return Array.from(groupedBySport.values())
      .map((group) => ({
        ...group,
        options: group.options
          .map((option) => ({
            ...option,
            entries: option.entries.sort((left, right) => {
              if (typeof left.year === 'number' && typeof right.year === 'number' && left.year !== right.year) {
                return right.year - left.year
              }

              return left.label.localeCompare(right.label)
            }),
          }))
          .sort((left, right) => left.familyLabel.localeCompare(right.familyLabel)),
      }))
      .sort((left, right) => left.sportLabel.localeCompare(right.sportLabel))
  }, [activeCompetitionId, currentOrigin])

  const getSportLabel = (sportLabel: string) => {
    if (sportLabel === 'football') return 'Football'
    if (sportLabel === 'rugby') return 'Rugby'
    return sportLabel.charAt(0).toUpperCase() + sportLabel.slice(1)
  }

  const getSportBackgroundIcon = (sportLabel: string) => {
    return sportLabel === 'rugby' ? '/icon-rugby.svg' : '/icon.svg'
  }

  return (
    <div className="grid gap-1">
      {groupedOptions.map((group) => (
        <div
          key={group.sportLabel}
          className="relative space-y-1 overflow-hidden"
        >
          <div className="relative z-10 flex items-center gap-2 px-2 pt-1.5">
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {getSportLabel(group.sportLabel)}
            </span>
          </div>
          <div className="relative grid gap-1 px-2 pt-1 pb-2">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 z-0 h-24 w-24 translate-x-1/2 -translate-y-1/2 bg-[var(--text-soft)] opacity-[0.08]"
              style={{
                maskImage: `url(${getSportBackgroundIcon(group.sportLabel)})`,
                WebkitMaskImage: `url(${getSportBackgroundIcon(group.sportLabel)})`,
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
            />
            {group.options.map((option) => (
              option.entries.length > 1 ? (
                <div key={option.familyId} className="relative z-10 border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  <p className="mb-2 text-xs font-semibold text-[var(--text)]">
                    {option.familyLabel}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {option.entries.map((entry) => (
                      entry.href ? (
                        <a
                          key={entry.id}
                          href={entry.href}
                          className="inline-flex min-w-11 items-center justify-center border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
                        >
                          {entry.year ?? entry.label}
                        </a>
                      ) : (
                        <span
                          key={entry.id}
                          className="inline-flex min-w-11 items-center justify-center border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] opacity-70"
                          aria-disabled="true"
                          title={t.labels.competition}
                        >
                          {entry.year ?? entry.label}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              ) : option.entries[0].href ? (
                <a
                  key={option.entries[0].id}
                  href={option.entries[0].href}
                  className="relative z-10 block border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
                >
                  {option.entries[0].label}
                </a>
              ) : (
                <span
                  key={option.entries[0].id}
                  className="relative z-10 block border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] opacity-70"
                  aria-disabled="true"
                  title={t.labels.competition}
                >
                  {option.entries[0].label}
                </span>
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
