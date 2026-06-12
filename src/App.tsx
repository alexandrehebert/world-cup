import { Header } from './components/layout/header'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './components/layout/dashboard-layout'
import { OverviewPage } from './pages/overview-page'
import { GroupsPage } from './pages/groups-page'
import { MatchesPage } from './pages/matches-page'
import { BracketPage } from './pages/bracket-page'

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout header={<Header />} />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/match" element={<MatchesPage />} />
        <Route path="/match/:homeCode/vs/:awayCode" element={<MatchesPage />} />
        <Route path="/bracket" element={<BracketPage />} />
      </Route>
    </Routes>
  )
}

export default App
