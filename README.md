# Football World Cup

Interactive World Cup app built with **Next.js + TypeScript**.  
It serves tournament data, supports user auth and predictions, and syncs match status updates from ESPN/Vercel cron.

## Tech stack

- Next.js App Router (`src/app`)
- React + TypeScript
- MongoDB (auth, preferences, predictions, leaderboard)
- Vercel Blob (tournament data in production)
- Node test runner (`tsx --test`)

## Getting started

### Local development

```bash
npm install
npm run dev
```

App runs on `http://localhost:3000` by default.

### Useful scripts

- `npm run dev` - start Next.js dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint with Next ESLint integration
- `npm test` - run test suite
- `npm run dev:vite` / `npm run build:vite` - legacy Vite entrypoints

## Environment variables

### Core

- `SESSION_SECRET` - signs auth session cookies
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB` (optional) - DB name (default: `world-cup`)
- `NEXT_PUBLIC_ENABLE_PREDICTIONS` (optional) - enables predictions when truthy (`true`, `1`, `yes`, `on`)

### Match sync / data pipeline

- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token
- `BLOB_OBJECT_ACCESS` (optional) - `private` (default) or `public`
- `MATCH_RESULTS_URL` (optional) - custom scoreboard endpoint
- `ESPN_LOOKBACK_DAYS` (optional) - lookback window for late score updates (default: `7`)
- `CRON_SECRET` (optional) - manual/external cron authorization secret

Default `MATCH_RESULTS_URL`:

`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`

## Match sync cron

- Endpoint: `POST /api/cron/sync-matches`
- Vercel schedule: `*/5 * * * *`
- Local Docker schedule: every minute

Sync accepts either:

```json
{
  "updatedAt": "2026-06-11T18:45:00Z",
  "matches": [
    { "id": "m1", "status": "finished" },
    { "id": "m2", "status": "live" }
  ]
}
```

or:

```json
[
  { "id": "m1", "status": "finished" },
  { "id": "m2", "status": "live" }
]
```

Supported statuses: `scheduled`, `live`, `finished`.

## Local Docker stack

The repository includes `app + mongo + cron` via `docker-compose.yml`.

1. Copy `.env.docker.example` to `.env` and adjust values.
2. Start:

```bash
docker compose up --build
```

Notes:
- App runs on `http://localhost:${APP_PORT:-3001}`
- Mongo is exposed at `localhost:${MONGODB_PORT:-27018}`
- Source is bind-mounted for live reload (polling enabled for Docker Desktop reliability)

## AI instruction files

This repository now includes Copilot/agent customization files:

- `AGENTS.md` (root): high-level entrypoint for coding agents
- `.github/copilot-instructions.md`: project-wide coding guidance
- `.github/instructions/app-pages.instructions.md`: App Router page/layout conventions
- `.github/instructions/ui.instructions.md`: React UI conventions
- `.github/instructions/api.instructions.md`: API route conventions
- `.github/instructions/server.instructions.md`: server/data-layer conventions
- `.github/instructions/lib.instructions.md`: shared domain utility conventions
- `.github/instructions/tests.instructions.md`: test conventions
