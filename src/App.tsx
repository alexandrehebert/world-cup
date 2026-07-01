import { Header } from './components/layout/header'
import { Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './components/layout/dashboard-layout'
import { OverviewPage } from './views/overview-page'
import { GroupsPage } from './views/groups-page'
import { MatchesPage } from './views/matches-page'
import { TeamsPage } from './views/teams-page'
import { BracketPage } from './views/bracket-page'
import { PredictionsPage } from './views/predictions-page'
import { LeaderboardPage } from './views/leaderboard-page'
import { ProfilePage } from './views/profile-page'
import { MatchPredictionPage } from './views/match-prediction-page'

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout header={<Header />} />}>
        <Route index element={<OverviewPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/team/:teamCode" element={<TeamsPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/match" element={<MatchesPage />} />
        <Route path="/match/:homeCode/vs/:awayCode" element={<MatchesPage />} />
        <Route path="/bracket" element={<BracketPage />} />
        <Route path="/predictions" element={<PredictionsPage />} />
        <Route path="/predict/:homeCode/vs/:awayCode" element={<MatchPredictionPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}

export default App
