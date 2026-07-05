const STADIUM_LIST_SCROLL_STATE_KEY = 'stadiumsListScrollTop'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const buildStadiumNavigationState = (currentState: unknown, listScrollTop: number) => {
  const baseState = isRecord(currentState) ? currentState : {}

  return {
    ...baseState,
    [STADIUM_LIST_SCROLL_STATE_KEY]: Math.max(0, listScrollTop),
  }
}

export const getStadiumListScrollTopFromState = (state: unknown) => {
  if (!isRecord(state)) {
    return null
  }

  const value = state[STADIUM_LIST_SCROLL_STATE_KEY]

  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }

  return value
}
