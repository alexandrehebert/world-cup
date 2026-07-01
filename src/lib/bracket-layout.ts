import type { BracketRoundRecord, MatchRecord, ParticipantRef } from '../types/tournament'

export const getWinnerSourceMatchId = (
  participant: ParticipantRef | undefined,
  expectedRoundId: string,
  roundMatchIdsById: Map<string, string[]>,
): string | undefined => {
  const placeholder = participant?.placeholder
  if (!placeholder) return undefined

  const [placeholderType, sourceRoundId, sourceSlotIndex] = placeholder.split(':')
  if (placeholderType !== 'W' || sourceRoundId !== expectedRoundId) return undefined

  const parsedSlot = Number.parseInt(sourceSlotIndex ?? '', 10)
  if (!Number.isInteger(parsedSlot) || parsedSlot <= 0) return undefined

  return roundMatchIdsById.get(sourceRoundId)?.[parsedSlot - 1]
}

export const alignSideRoundsByNextRound = (
  sideRounds: Pick<BracketRoundRecord, 'id' | 'matchIds'>[],
  matchesById: Record<string, MatchRecord>,
  roundMatchIdsById: Map<string, string[]>,
) => {
  const alignedRounds = sideRounds.map((round) => ({ ...round, matchIds: [...round.matchIds] }))

  for (let roundIndex = alignedRounds.length - 2; roundIndex >= 0; roundIndex -= 1) {
    const currentRound = alignedRounds[roundIndex]
    const nextRound = alignedRounds[roundIndex + 1]
    const currentMatchIds = new Set(currentRound.matchIds)
    const orderedCurrentMatchIds: string[] = []

    for (const nextMatchId of nextRound.matchIds) {
      const nextMatch = matchesById[nextMatchId]
      if (!nextMatch) continue

      const sourceHomeMatchId = getWinnerSourceMatchId(nextMatch.home, currentRound.id, roundMatchIdsById)
      const sourceAwayMatchId = getWinnerSourceMatchId(nextMatch.away, currentRound.id, roundMatchIdsById)

      if (sourceHomeMatchId && currentMatchIds.has(sourceHomeMatchId) && !orderedCurrentMatchIds.includes(sourceHomeMatchId)) {
        orderedCurrentMatchIds.push(sourceHomeMatchId)
      }

      if (sourceAwayMatchId && currentMatchIds.has(sourceAwayMatchId) && !orderedCurrentMatchIds.includes(sourceAwayMatchId)) {
        orderedCurrentMatchIds.push(sourceAwayMatchId)
      }
    }

    for (const fallbackMatchId of currentRound.matchIds) {
      if (!orderedCurrentMatchIds.includes(fallbackMatchId)) {
        orderedCurrentMatchIds.push(fallbackMatchId)
      }
    }

    currentRound.matchIds = orderedCurrentMatchIds
  }

  return alignedRounds
}
