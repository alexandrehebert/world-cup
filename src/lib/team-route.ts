const normalizeTeamPathSegment = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')

export const isParaguayEasterEggTeamPath = (teamCode: string | undefined) => {
  if (!teamCode) {
    return false
  }

  return normalizeTeamPathSegment(teamCode) === 'paraguay'
}
