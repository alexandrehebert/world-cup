export type LocaleCode = 'en' | 'fr' | 'es' | 'de'

export type SectionKey = 'overview' | 'groups' | 'teams' | 'matches' | 'finalPhase' | 'bracket' | 'predictions' | 'leaderboard'

export interface TournamentMeta {
  competitionId?: string
  edition: string
  season: string
  host: string
  updatedAt: string
  venueCountry: string
}

export interface TeamRecord {
  id: string
  code: string
  name: string
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
  label: string
  teamIds: string[]
  standings: StandingRecord[]
  matchIds: string[]
}

export interface ParticipantRef {
  teamId?: string
  placeholder?: string
  score?: number
  penaltyScore?: number
}

export interface MatchVenue {
  stadium: string
  city: string
  country: string
  timeZone: string
}

export interface MatchLiveRecord {
  state?: 'pre' | 'in' | 'post'
  period?: number
  clock?: number
  displayClock?: string
  detail?: string
  shortDetail?: string
  completed?: boolean
  startDate?: string
  firstSeenLiveAt?: string
  syncedAt?: string
}

export interface MatchRecord {
  id: string
  stage: 'group' | 'roundOf32' | 'roundOf16' | 'quarterFinal' | 'semiFinal' | 'final' | 'thirdPlace'
  groupId?: string
  roundId?: string
  home: ParticipantRef
  away: ParticipantRef
  kickoff: string
  venue: MatchVenue
  status: 'scheduled' | 'live' | 'finished'
  live?: MatchLiveRecord
}

export interface BracketRoundRecord {
  id: string
  matchIds: string[]
}

export interface TournamentData {
  meta: TournamentMeta
  teams: TeamRecord[]
  groups: GroupRecord[]
  matches: MatchRecord[]
  bracketRounds: BracketRoundRecord[]
}
