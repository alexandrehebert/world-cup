import ClientApp from './client-app'
import { loadClientBootstrapData } from '../server/client-bootstrap'
import { loadTournamentData } from '../server/tournament-data'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [tournamentData, bootstrapData] = await Promise.all([loadTournamentData(), loadClientBootstrapData()])

  return <ClientApp initialData={tournamentData} bootstrapData={bootstrapData} />
}
