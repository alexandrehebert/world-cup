export type LocaleCode = 'en' | 'fr'

export type LocalizedText = Record<LocaleCode, string>

export type SectionKey = 'overview' | 'groups' | 'matches' | 'bracket'

export interface TournamentMeta {
  edition: string
  season: string
  host: string
  updatedAt: string
  venueCountry: string
}

export interface TeamRecord {
  id: string
  code: string
  name: LocalizedText
  flagCode: string
}

export interface StandingRecord {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

export interface GroupRecord {
  id: string
  label: LocalizedText
  teamIds: string[]
  standings: StandingRecord[]
  matchIds: string[]
}

export interface ParticipantRef {
  teamId?: string
  placeholder?: LocalizedText
  score?: number
}

export interface MatchVenue {
  stadium: LocalizedText
  city: LocalizedText
  country: LocalizedText
  timeZone: string
}

export interface MatchRecord {
  id: string
  stage: 'group' | 'roundOf16' | 'quarterFinal' | 'semiFinal' | 'final' | 'thirdPlace'
  groupId?: string
  roundId?: string
  home: ParticipantRef
  away: ParticipantRef
  kickoff: string
  venue: MatchVenue
  status: 'scheduled' | 'live' | 'finished'
}

export interface BracketRoundRecord {
  id: string
  label: LocalizedText
  matchIds: string[]
}

export interface TournamentData {
  meta: TournamentMeta
  teams: TeamRecord[]
  groups: GroupRecord[]
  matches: MatchRecord[]
  bracketRounds: BracketRoundRecord[]
}
