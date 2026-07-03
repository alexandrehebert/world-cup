const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]+/g
const WHITESPACE_REGEX = /\s+/g

export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_REGEX, ' ')
    .trim()
    .replace(WHITESPACE_REGEX, ' ')

const getTypoTolerance = (queryLength: number) => {
  if (queryLength < 4) {
    return 0
  }

  if (queryLength < 7) {
    return 1
  }

  return 2
}

const getBoundedDamerauLevenshteinDistance = (source: string, target: string, maxDistance: number) => {
  if (Math.abs(source.length - target.length) > maxDistance) {
    return null
  }

  let previousPrevious = new Array(target.length + 1).fill(0)
  let previous = Array.from({ length: target.length + 1 }, (_, index) => index)

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    const current = new Array(target.length + 1).fill(0)
    current[0] = sourceIndex
    let rowMin = current[0]

    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const substitutionCost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1
      let value = Math.min(
        previous[targetIndex] + 1,
        current[targetIndex - 1] + 1,
        previous[targetIndex - 1] + substitutionCost,
      )

      if (
        sourceIndex > 1 &&
        targetIndex > 1 &&
        source[sourceIndex - 1] === target[targetIndex - 2] &&
        source[sourceIndex - 2] === target[targetIndex - 1]
      ) {
        value = Math.min(value, previousPrevious[targetIndex - 2] + 1)
      }

      current[targetIndex] = value
      rowMin = Math.min(rowMin, value)
    }

    if (rowMin > maxDistance) {
      return null
    }

    previousPrevious = previous
    previous = current
  }

  const distance = previous[target.length]
  return distance <= maxDistance ? distance : null
}

const tokenMatches = (queryToken: string, candidateToken: string) => {
  if (candidateToken.includes(queryToken)) {
    return true
  }

  const typoTolerance = getTypoTolerance(queryToken.length)
  if (typoTolerance === 0 || candidateToken.length < 4) {
    return false
  }

  return getBoundedDamerauLevenshteinDistance(queryToken, candidateToken, typoTolerance) !== null
}

export const isSearchMatch = (query: string, candidateValues: readonly string[]) => {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return true
  }

  const normalizedCandidates = candidateValues
    .map((value) => normalizeSearchText(value))
    .filter((value) => value.length > 0)
  if (normalizedCandidates.length === 0) {
    return false
  }

  const queryTokens = normalizedQuery.split(' ')
  const candidateTokens = normalizedCandidates.flatMap((value) => value.split(' '))
  const compactCandidates = normalizedCandidates.map((value) => value.replace(WHITESPACE_REGEX, ''))

  return queryTokens.every((queryToken) =>
    candidateTokens.some((candidateToken) => tokenMatches(queryToken, candidateToken)) ||
    compactCandidates.some((candidateToken) => tokenMatches(queryToken, candidateToken)),
  )
}
