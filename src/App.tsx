import { Header } from './components/layout/header'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './components/layout/dashboard-layout'
import { OverviewPage } from './views/overview-page'
import { DashboardPage } from './views/dashboard-page'
import { GroupsPage } from './views/groups-page'
import { MatchesPage } from './views/matches-page'
import { TeamsPage } from './views/teams-page'
import { BracketPage } from './views/bracket-page'
import { PredictionsPage } from './views/predictions-page'
import { LeaderboardPage } from './views/leaderboard-page'
import { ProfilePage } from './views/profile-page'
import { MatchPredictionPage } from './views/match-prediction-page'
import { NotFoundPage } from './views/not-found-page'
import { resolveCompetitionId } from './competitions'
import { isPredictionsFeatureEnabled } from './lib/features'
import { getStandingsSectionPath, usesStandingsSectionPath } from './lib/competition-sections'
import { useTournament } from './contexts/tournament-context'
import { hasBracketSection, hasGroupsSection } from './lib/tournament-sections'

function App() {
  const { meta, groups, bracketRounds } = useTournament()
  const competitionId = resolveCompetitionId(meta.competitionId)
  const hasGroups = hasGroupsSection(groups)
  const hasBracket = hasBracketSection(bracketRounds)
  const groupsSectionPath = getStandingsSectionPath(competitionId)
  const useStandingsPath = usesStandingsSectionPath(competitionId)

  return (
    <Routes>
      <Route element={<DashboardLayout header={<Header />} />}>
        <Route index element={<DashboardPage />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/agenda" element={<OverviewPage />} />
        <Route path="/overview" element={<Navigate to="/agenda" replace />} />
        <Route
          path="/groups"
          element={useStandingsPath ? <Navigate to={groupsSectionPath} replace /> : (hasGroups ? <GroupsPage /> : <Navigate to="/agenda" replace />)}
        />
        <Route
          path="/standings"
          element={useStandingsPath ? (hasGroups ? <GroupsPage /> : <Navigate to="/agenda" replace />) : <Navigate to="/groups" replace />}
        />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/team/:teamCode" element={<TeamsPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/match" element={<MatchesPage />} />
        <Route path="/match/tbd/:round/:slot" element={<MatchesPage />} />
        <Route path="/match/:stage/:homeCode/vs/:awayCode" element={<MatchesPage />} />
        <Route path="/match/:homeCode/vs/:awayCode" element={<MatchesPage />} />
        <Route path="/bracket" element={hasBracket ? <BracketPage /> : <Navigate to="/agenda" replace />} />
        <Route path="/bracket/tbd/:round/:slot" element={hasBracket ? <BracketPage /> : <Navigate to="/agenda" replace />} />
        <Route path="/bracket/:stage/:homeCode/vs/:awayCode" element={hasBracket ? <BracketPage /> : <Navigate to="/agenda" replace />} />
        <Route path="/bracket/:homeCode/vs/:awayCode" element={hasBracket ? <BracketPage /> : <Navigate to="/agenda" replace />} />
        <Route
          path="/predictions"
          element={isPredictionsFeatureEnabled ? <PredictionsPage /> : <Navigate to="/agenda" replace />}
        />
        <Route
          path="/predict"
          element={isPredictionsFeatureEnabled ? <MatchPredictionPage /> : <Navigate to="/agenda" replace />}
        />
        <Route
          path="/predict/tbd/:round/:slot"
          element={isPredictionsFeatureEnabled ? <MatchPredictionPage /> : <Navigate to="/agenda" replace />}
        />
        <Route
          path="/predict/:stage/:homeCode/vs/:awayCode"
          element={isPredictionsFeatureEnabled ? <MatchPredictionPage /> : <Navigate to="/agenda" replace />}
        />
        <Route
          path="/predict/:homeCode/vs/:awayCode"
          element={isPredictionsFeatureEnabled ? <MatchPredictionPage /> : <Navigate to="/agenda" replace />}
        />
        <Route
          path="/leaderboard"
          element={isPredictionsFeatureEnabled ? <LeaderboardPage /> : <Navigate to="/agenda" replace />}
        />
        <Route
          path="/profile/:username"
          element={isPredictionsFeatureEnabled ? <ProfilePage /> : <Navigate to="/agenda" replace />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
