import { getActiveCompetitionProfile, getCompetitionProfile, resolveCompetitionId } from '../competitions'

export const getActiveCompetitionBallIconName = () => {
  return getActiveCompetitionProfile().ballIcon === 'rugby' ? 'sports_rugby' : 'sports_soccer'
}

export const getCompetitionBallIconNameById = (competitionId: string | undefined) => {
  const competition = getCompetitionProfile(resolveCompetitionId(competitionId))
  return competition.ballIcon === 'rugby' ? 'sports_rugby' : 'sports_soccer'
}

export const getCompetitionIconAssetById = (competitionId: string | undefined) => {
  return getCompetitionBallIconNameById(competitionId) === 'sports_rugby' ? '/icon-rugby.svg' : '/icon.svg'
}

export const getActiveCompetitionAppIcons = () => {
  const profile = getActiveCompetitionProfile()

  if (profile.ballIcon === 'rugby') {
    return {
      icon: '/icon-rugby.svg',
      favicon: '/favicon-rugby.svg',
    }
  }

  return {
    icon: '/icon.svg',
    favicon: '/favicon.svg',
  }
}

export const getActiveCompetitionLoaderIconAsset = () => {
  const profile = getActiveCompetitionProfile()
  return getCompetitionIconAssetById(profile.id)
}
