import ClientApp from './client-app'
import { loadClientBootstrapData } from '../server/client-bootstrap'
import { loadTournamentData } from '../server/tournament-data'

export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const [tournamentData, bootstrapData] = await Promise.all([loadTournamentData(), loadClientBootstrapData()])
  const queryEntries: [string, string][] = []

  if (resolvedSearchParams) {
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === 'string') {
        queryEntries.push([key, value])
        continue
      }

      if (Array.isArray(value)) {
        for (const entry of value) {
          queryEntries.push([key, entry])
        }
      }
    }
  }

  const query = resolvedSearchParams ? new URLSearchParams(queryEntries).toString() : ''

  return <ClientApp initialData={tournamentData} bootstrapData={bootstrapData} initialPath={query ? `/?${query}` : '/'} />
}
