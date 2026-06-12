import http from 'node:http'
import fs from 'node:fs/promises'

const dataPath = new URL('../src/data/worldcup.json', import.meta.url)
const before = JSON.parse(await fs.readFile(dataPath, 'utf8'))
const beforeM1 = before.matches.find((m) => m.id === 'm1')

const server = http.createServer((req, res) => {
  if (req.url === '/results') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify({
        updatedAt: '2026-06-11T22:00:00Z',
        matches: [{ id: 'm1', status: 'finished', homeScore: 2, awayScore: 1 }],
      }),
    )
    return
  }

  res.writeHead(404, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
})

await new Promise((resolve) => server.listen(4310, '127.0.0.1', resolve))

process.env.MATCH_RESULTS_URL = 'http://127.0.0.1:4310/results'
delete process.env.CRON_SECRET

const endpoint = 'http://127.0.0.1:3000/api/cron/sync-matches'
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    authorization: 'Bearer local-test',
  },
})
const captured = {
  statusCode: response.status,
  body: await response.json(),
}

await new Promise((resolve) => server.close(resolve))

const after = JSON.parse(await fs.readFile(dataPath, 'utf8'))
const afterM1 = after.matches.find((m) => m.id === 'm1')

console.log('cron_status=' + captured.statusCode)
console.log('cron_body=' + JSON.stringify(captured.body))
console.log('before_m1=' + String(beforeM1?.status))
console.log('after_m1=' + String(afterM1?.status))
console.log('after_updatedAt=' + String(after.meta?.updatedAt))
