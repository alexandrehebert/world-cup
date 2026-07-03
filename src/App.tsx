import { Header } from './components/layout/header'
import { Navigate, Route, Routes } from 'react-router-dom'
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
import { NotFoundPage } from './views/not-found-page'
import { isPredictionsFeatureEnabled } from './lib/features'

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout header={<Header />} />}>
        <Route index element={<OverviewPage />} />
        <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/team/:teamCode" element={<TeamsPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/match" element={<MatchesPage />} />
        <Route path="/match/tbd/:round/:slot" element={<MatchesPage />} />
        <Route path="/match/:stage/:homeCode/vs/:awayCode" element={<MatchesPage />} />
        <Route path="/match/:homeCode/vs/:awayCode" element={<MatchesPage />} />
        <Route path="/bracket" element={<BracketPage />} />
        <Route path="/bracket/tbd/:round/:slot" element={<BracketPage />} />
        <Route path="/bracket/:stage/:homeCode/vs/:awayCode" element={<BracketPage />} />
        <Route path="/bracket/:homeCode/vs/:awayCode" element={<BracketPage />} />
        <Route
          path="/predictions"
          element={isPredictionsFeatureEnabled ? <PredictionsPage /> : <Navigate to="/overview" replace />}
        />
        <Route
          path="/predict"
          element={isPredictionsFeatureEnabled ? <MatchPredictionPage /> : <Navigate to="/overview" replace />}
        />
        <Route
          path="/predict/tbd/:round/:slot"
          element={isPredictionsFeatureEnabled ? <MatchPredictionPage /> : <Navigate to="/overview" replace />}
        />
        <Route
          path="/predict/:stage/:homeCode/vs/:awayCode"
          element={isPredictionsFeatureEnabled ? <MatchPredictionPage /> : <Navigate to="/overview" replace />}
        />
        <Route
          path="/predict/:homeCode/vs/:awayCode"
          element={isPredictionsFeatureEnabled ? <MatchPredictionPage /> : <Navigate to="/overview" replace />}
        />
        <Route
          path="/leaderboard"
          element={isPredictionsFeatureEnabled ? <LeaderboardPage /> : <Navigate to="/overview" replace />}
        />
        <Route
          path="/profile/:username"
          element={isPredictionsFeatureEnabled ? <ProfilePage /> : <Navigate to="/overview" replace />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
