import { useMemo } from 'react'
import { listCompetitionProfiles } from '../../competitions'
import type { CompetitionId } from '../../competitions/types'
import { useLocale } from '../../contexts/locale-context'
import { Icon } from '../../lib/icons'

const LOCAL_SWITCH_URL_BY_ID: Record<CompetitionId, string> = {
  'world-cup-2026': 'http://localhost:3001',
  'nations-championship-2026': 'http://localhost:3002',
}

const configuredSiteUrlById: Partial<Record<CompetitionId, string | undefined>> = {
  'world-cup-2026': process.env.NEXT_PUBLIC_WORLD_CUP_SITE_URL,
  'nations-championship-2026': process.env.NEXT_PUBLIC_NATIONS_CHAMPIONSHIP_SITE_URL,
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
  return `${parsed.protocol}//${parsed.host}`
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

const resolveCompetitionUrl = (competitionId: CompetitionId, activeCompetitionId: string | undefined, currentOrigin: string | null) => {
  const configuredUrl = toBaseUrl(configuredSiteUrlById[competitionId])
  if (configuredUrl) {
    return `${configuredUrl}/overview`
  }

  if (isLocalOrigin(currentOrigin)) {
    return `${LOCAL_SWITCH_URL_BY_ID[competitionId]}/overview`
  }

  if (activeCompetitionId === competitionId && currentOrigin) {
    return `${currentOrigin}/overview`
  }

  return null
}

export const CompetitionSwitcher = ({ activeCompetitionId }: { activeCompetitionId?: string }) => {
  const { locale, t } = useLocale()
  const currentOrigin = getCurrentOrigin()

  const groupedOptions = useMemo(() => {
    const groupedBySport = new Map<
      string,
      {
        sportLabel: string
        iconName: 'sports_soccer' | 'sports_rugby'
        options: { id: CompetitionId; label: string; href: string | null }[]
      }
    >()

    for (const competition of listCompetitionProfiles()) {
      if (activeCompetitionId === competition.id) {
        continue
      }

      const sportKey = competition.sportLabel
      const iconName = competition.ballIcon === 'rugby' ? 'sports_rugby' : 'sports_soccer'
      const existingGroup = groupedBySport.get(sportKey)
      const option = {
        id: competition.id,
        label: competition.displayName,
        href: resolveCompetitionUrl(competition.id, activeCompetitionId, currentOrigin),
      }

      if (existingGroup) {
        existingGroup.options.push(option)
      } else {
        groupedBySport.set(sportKey, {
          sportLabel: competition.sportLabel,
          iconName,
          options: [option],
        })
      }
    }

    return Array.from(groupedBySport.values())
      .map((group) => ({
        ...group,
        options: group.options.sort((left, right) => left.label.localeCompare(right.label)),
      }))
      .sort((left, right) => left.sportLabel.localeCompare(right.sportLabel))
  }, [activeCompetitionId, currentOrigin])

  const getSportLabel = (sportLabel: string) => {
    if (sportLabel === 'football') {
      return locale === 'fr' ? 'Football' : 'Football'
    }

    if (sportLabel === 'rugby') {
      return locale === 'fr' ? 'Rugby' : 'Rugby'
    }

    return sportLabel.charAt(0).toUpperCase() + sportLabel.slice(1)
  }

  return (
    <div className="grid gap-1">
      {groupedOptions.map((group) => (
        <div key={group.sportLabel} className="space-y-1.5">
          <p className="inline-flex items-center gap-1 px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <Icon
              name={group.iconName}
              className="text-[10px] opacity-55 [font-variation-settings:'FILL'_0,'wght'_300,'GRAD'_0,'opsz'_20]"
            />
            <span>{getSportLabel(group.sportLabel)}</span>
          </p>
          <div className="grid gap-1">
            {group.options.map((option) => (
              option.href ? (
                <a
                  key={option.id}
                  href={option.href}
                  className="block border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
                >
                  {option.label}
                </a>
              ) : (
                <span
                  key={option.id}
                  className="block border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] opacity-70"
                  aria-disabled="true"
                  title={t.labels.competition}
                >
                  {option.label}
                </span>
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
