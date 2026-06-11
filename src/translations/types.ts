export interface TranslationSet {
  locale: string
  appName: string
  sections: {
    overview: string
    groups: string
    matches: string
    bracket: string
  }
  headings: {
    groups: string
    upcomingMatches: string
    bracket: string
  }
  overview: {
    title: string
    copy: string
    stats: {
      matches: string
      rounds: string
      teams: string
      staticDeploy: string
    }
  }
  meta: {
    groups: string
    matches: string
    updated: string
    localTime: string
    utcTime: string
    venue: string
  }
  labels: {
    language: string
    theme: string
    lightTheme: string
    darkTheme: string
    standings: string
    played: string
    won: string
    drawn: string
    lost: string
    goals: string
    points: string
    groupStage: string
    kickoff: string
    status: string
    scheduled: string
    live: string
    finished: string
    noMatchSelected: string
    localeHint: string
    team: string
    details: string
    close: string
    rounds: string
    comingSoon: string
    matchesHosted: string
    cities: string
    countries: string
    stageGroup: string
    stageRoundOf16: string
    stageQuarterFinal: string
    stageSemiFinal: string
    stageThirdPlace: string
    stageFinal: string
    filterByCountries: string
    clearCountryFilters: string
    noMatchesForCountries: string
    searchCountryPlaceholder: string
    noCountrySearchResults: string
  }
}
