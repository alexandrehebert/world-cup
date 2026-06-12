import { useLocale } from '../../contexts/locale-context'
import { useDashboard } from '../../contexts/dashboard-context'
import { useTournament } from '../../contexts/tournament-context'
import { formatMatchDate, getLocalizedText } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { FlagAvatar } from '../ui/flag-avatar'

const NODE_HEIGHT = 196
const BASE_GAP = 20
const CONNECTOR_WIDTH = 32

const getRoundMetrics = (roundIndex: number) => {
  const unit = NODE_HEIGHT + BASE_GAP
  const roundFactor = 2 ** roundIndex

  return {
    topOffset: roundIndex === 0 ? 0 : ((roundFactor - 1) * unit) / 2,
    gap: roundIndex === 0 ? BASE_GAP : roundFactor * unit - NODE_HEIGHT,
  }
}

export const BracketBoard = ({
  rounds,
}: {
  rounds: { id: string; label: { en: string; fr: string }; matchIds: string[] }[]
}) => {
  const { locale, t } = useLocale()
  const { isFavoriteTeam } = useDashboard()
  const { matchesById, teamsById } = useTournament()

  const thirdPlaceRound = rounds.find((round) => round.id === 'thirdPlace')
  const mainRounds = rounds.filter((round) => round.id !== 'thirdPlace')
  const firstRoundMatchCount = mainRounds.at(0)?.matchIds.length ?? 0
  const boardTrackHeight = Math.max(NODE_HEIGHT, firstRoundMatchCount * NODE_HEIGHT + Math.max(0, firstRoundMatchCount - 1) * BASE_GAP)

  return (
    <div className="bg-[var(--surface)] p-4 sm:p-5 lg:p-6">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-full items-start" style={{ gap: `${CONNECTOR_WIDTH}px` }}>
          {mainRounds.map((round, roundIndex) => {
            const metrics = getRoundMetrics(roundIndex)
            const hasPreviousRound = roundIndex > 0
            const hasNextRound = roundIndex < mainRounds.length - 1
            const isFinalRound = round.id === 'final'

            return (
              <div key={round.id} className="flex min-w-[230px] flex-1 basis-0 flex-col">
                <div className="border-b border-[var(--border)] pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]">
                    {getLocalizedText(round.label, locale)}
                  </p>
                </div>

                <div className="relative mt-4" style={{ minHeight: `${boardTrackHeight}px`, paddingTop: `${metrics.topOffset}px` }}>
                  <div className="flex flex-col" style={{ gap: `${metrics.gap}px` }}>
                    {round.matchIds.length > 0 ? (
                      round.matchIds.map((matchId, matchIndex) => {
                        const match = matchesById[matchId]
                        const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                        const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                        const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
                        const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
                        const hasFavorite = homeIsFavorite || awayIsFavorite
                        const { localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone)
                        const showVerticalBridge =
                          hasNextRound && matchIndex % 2 === 0 && matchIndex + 1 < round.matchIds.length

                        return (
                          <div key={match.id} className="relative">
                            {hasPreviousRound ? (
                              <span
                                className="pointer-events-none absolute top-1/2 -left-[16px] h-px bg-[var(--border)]"
                                style={{ width: `${CONNECTOR_WIDTH / 2}px` }}
                              />
                            ) : null}

                            {showVerticalBridge ? (
                              <span
                                className="pointer-events-none absolute top-1/2 -right-[16px] w-px bg-[var(--border)]"
                                style={{ height: `${NODE_HEIGHT + metrics.gap}px` }}
                              />
                            ) : null}

                            {hasNextRound ? (
                              <span
                                className="pointer-events-none absolute top-1/2 -right-[16px] h-px bg-[var(--border)]"
                                style={{ width: `${CONNECTOR_WIDTH}px` }}
                              />
                            ) : null}

                            <div className={`relative h-[196px] overflow-hidden p-3 ${
                              hasFavorite
                                ? 'bg-[var(--accent-muted)] outline outline-2 outline-[var(--accent-border)]'
                                : 'bg-[var(--surface-soft)]'
                            }`}>
                              <div className="space-y-2">
                                <div className="flex min-w-0 items-center gap-2.5 border-b border-[var(--border)] pb-2">
                                  {homeTeam ? (
                                    <FlagAvatar team={homeTeam} />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full border border-dashed border-[var(--border)]" />
                                  )}
                                  <span className="inline-flex min-w-0 flex-1 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                    <span className="truncate">
                                      {homeTeam
                                        ? getLocalizedText(homeTeam.name, locale)
                                        : getLocalizedText(match.home.placeholder!, locale)}
                                    </span>
                                    {homeIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                                  </span>
                                </div>
                                <div className="flex min-w-0 items-center gap-2.5 pb-1">
                                  {awayTeam ? (
                                    <FlagAvatar team={awayTeam} />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full border border-dashed border-[var(--border)]" />
                                  )}
                                  <span className="inline-flex min-w-0 flex-1 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                    <span className="truncate">
                                      {awayTeam
                                        ? getLocalizedText(awayTeam.name, locale)
                                        : getLocalizedText(match.away.placeholder!, locale)}
                                    </span>
                                    {awayIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 border-t border-[var(--border)] pt-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-soft)]">
                                {t.meta.localTime} · {localTime}
                              </div>
                              <div className="truncate text-xs text-[var(--text-soft)]">
                                {getLocalizedText(match.venue.stadium, locale)}
                              </div>
                              <div className="truncate text-xs text-[var(--text-muted)]">
                                {getLocalizedText(match.venue.city, locale)}, {getLocalizedText(match.venue.country, locale)}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-soft)]">
                        {t.labels.comingSoon}
                      </div>
                    )}
                  </div>
                </div>

                {isFinalRound && thirdPlaceRound && thirdPlaceRound.matchIds.length > 0 ? (
                  <div className="mt-auto pt-8">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]">
                      {getLocalizedText(thirdPlaceRound.label, locale)}
                    </p>
                    <div className="space-y-px">
                      {thirdPlaceRound.matchIds.map((matchId) => {
                        const match = matchesById[matchId]
                        const homeTeam = match.home.teamId ? teamsById[match.home.teamId] : undefined
                        const awayTeam = match.away.teamId ? teamsById[match.away.teamId] : undefined
                        const homeIsFavorite = homeTeam ? isFavoriteTeam(homeTeam.id) : false
                        const awayIsFavorite = awayTeam ? isFavoriteTeam(awayTeam.id) : false
                        const hasFavorite = homeIsFavorite || awayIsFavorite
                        const { localTime } = formatMatchDate(match.kickoff, locale, match.venue.timeZone)

                        return (
                          <div key={match.id} className={`p-3 ${
                            hasFavorite
                              ? 'bg-[var(--accent-muted)] outline outline-2 outline-[var(--accent-border)]'
                              : 'bg-[var(--surface-soft)]'
                          }`}>
                            <div className="space-y-2">
                              <div className="flex min-w-0 items-center gap-2.5 border-b border-[var(--border)] pb-2">
                                {homeTeam ? (
                                  <FlagAvatar team={homeTeam} />
                                ) : (
                                  <div className="h-10 w-10 rounded-full border border-dashed border-[var(--border)]" />
                                )}
                                <span className="inline-flex min-w-0 flex-1 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                  <span className="truncate">
                                    {homeTeam
                                      ? getLocalizedText(homeTeam.name, locale)
                                      : getLocalizedText(match.home.placeholder!, locale)}
                                  </span>
                                  {homeIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                                </span>
                              </div>
                              <div className="flex min-w-0 items-center gap-2.5 pb-1">
                                {awayTeam ? (
                                  <FlagAvatar team={awayTeam} />
                                ) : (
                                  <div className="h-10 w-10 rounded-full border border-dashed border-[var(--border)]" />
                                )}
                                <span className="inline-flex min-w-0 flex-1 items-center gap-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                                  <span className="truncate">
                                    {awayTeam
                                      ? getLocalizedText(awayTeam.name, locale)
                                      : getLocalizedText(match.away.placeholder!, locale)}
                                  </span>
                                  {awayIsFavorite ? <Icon name="star" className="text-[14px] text-[var(--accent-text)]" /> : null}
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 border-t border-[var(--border)] pt-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-soft)]">
                              {t.meta.localTime} · {localTime}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
