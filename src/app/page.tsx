import ClientApp from './client-app'
import { loadClientBootstrapData } from '../server/client-bootstrap'
import { loadTournamentData } from '../server/tournament-data'

export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const [tournamentData, bootstrapData] = await Promise.all([loadTournamentData(), loadClientBootstrapData()])
  const query = resolvedSearchParams
    ? new URLSearchParams(
        Object.entries(resolvedSearchParams).flatMap(([key, value]) => {
          if (typeof value === 'string') {
            return [[key, value]]
          }

          if (Array.isArray(value)) {
            return value.map((entry) => [key, entry] as const)
          }

          return []
        }),
      ).toString()
    : ''

  return <ClientApp initialData={tournamentData} bootstrapData={bootstrapData} initialPath={query ? `/?${query}` : '/'} />
}
