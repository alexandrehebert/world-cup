# Tournament Dashboard (Multi-competition)

Interactive tournament app built with **Next.js + TypeScript**.  
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

- `COMPETITION_ID` - active competition profile (`world-cup-2026` default, `nations-championship-2026`, `six-nations-championship-2026`, and `six-nations-championship-2025` supported; `six-nations-championship` aliases to 2026)
- `SESSION_SECRET` - signs auth session cookies
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB` (optional) - DB name (defaults to active competition profile DB)
- `NEXT_PUBLIC_ENABLE_PREDICTIONS` (optional) - enables predictions when truthy (`true`, `1`, `yes`, `on`)
- `NEXT_PUBLIC_WORLD_CUP_SITE_URL` (optional) - site URL used by the competition switcher for World Cup
- `NEXT_PUBLIC_NATIONS_CHAMPIONSHIP_SITE_URL` (optional) - site URL used by the competition switcher for Nations Championship
- `NEXT_PUBLIC_SIX_NATIONS_CHAMPIONSHIP_SITE_URL` (optional) - site URL used by the competition switcher for Six Nations Championship

### Match sync / data pipeline

- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token
- `BLOB_OBJECT_ACCESS` (optional) - `private` (default) or `public`
- `MATCH_RESULTS_URL` (optional) - custom scoreboard endpoint (required for profiles without a built-in default feed URL)
- `ESPN_LOOKBACK_DAYS` (optional) - lookback window for late score updates (default: `7`)
- `CRON_SECRET` (optional) - manual/external cron authorization secret

Default `MATCH_RESULTS_URL` for `world-cup-2026`:

`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`

Default `MATCH_RESULTS_URL` for `nations-championship-2026`:

`https://api.wr-rims-prod.pulselive.com/rugby/v3/event/46294cf5-dee3-4234-957a-dbe1f08049f2/schedule`

Default `MATCH_RESULTS_URL` for `six-nations-championship-2026`:

`https://api.wr-rims-prod.pulselive.com/rugby/v3/event/b6832e99-0c73-4d56-ba57-725935c2f1dd/schedule`

For rugby profile sync, teams and standings are also fetched from the same event base:

- `/teams`
- `/standings`

## Competition profiles

Profiles are defined under `src/competitions/` and centralize:

- branding and names
- local tournament data file
- blob storage path
- default Mongo DB name
- default match feed URL (optional)

Bundled profiles:

- `world-cup-2026` -> `src/data/2026-football-world-cup.json`
- `nations-championship-2026` -> `src/data/2026-rugby-nations-championship.json`
- `six-nations-championship-2026` -> `src/data/2026-rugby-six-nations-championship.json`
- `six-nations-championship-2025` -> `src/data/2025-rugby-six-nations-championship.json`

## Deploying multiple Vercel projects from one repo

Create separate Vercel projects that point to the same repository and branch, and set different env values:

### Project A (Football World Cup)

- `COMPETITION_ID=world-cup-2026`
- `NEXT_PUBLIC_COMPETITION_ID=world-cup-2026`
- `MONGODB_DB=world-cup` (or omit to use profile default)
- `MATCH_RESULTS_URL` optional (profile default already set)
- `NEXT_PUBLIC_WORLD_CUP_SITE_URL=https://<world-cup-project-domain>`
- `NEXT_PUBLIC_NATIONS_CHAMPIONSHIP_SITE_URL=https://<nations-project-domain>`
- `NEXT_PUBLIC_SIX_NATIONS_CHAMPIONSHIP_SITE_URL=https://<six-nations-project-domain>`

### Project B (Rugby Nations Championship)

- `COMPETITION_ID=nations-championship-2026`
- `NEXT_PUBLIC_COMPETITION_ID=nations-championship-2026`
- `MONGODB_DB=nations-championship-2026` (or omit to use profile default)
- `MATCH_RESULTS_URL=<your rugby results feed endpoint>`
- `NEXT_PUBLIC_WORLD_CUP_SITE_URL=https://<world-cup-project-domain>`
- `NEXT_PUBLIC_NATIONS_CHAMPIONSHIP_SITE_URL=https://<nations-project-domain>`
- `NEXT_PUBLIC_SIX_NATIONS_CHAMPIONSHIP_SITE_URL=https://<six-nations-project-domain>`

### Project C (Rugby Six Nations Championship 2026)

- `COMPETITION_ID=six-nations-championship-2026`
- `NEXT_PUBLIC_COMPETITION_ID=six-nations-championship-2026`
- `MONGODB_DB=six-nations-championship-2026` (or omit to use profile default)
- `MATCH_RESULTS_URL` optional (profile default already set)
- `NEXT_PUBLIC_WORLD_CUP_SITE_URL=https://<world-cup-project-domain>`
- `NEXT_PUBLIC_NATIONS_CHAMPIONSHIP_SITE_URL=https://<nations-project-domain>`
- `NEXT_PUBLIC_SIX_NATIONS_CHAMPIONSHIP_SITE_URL=https://<six-nations-project-domain>`

All projects can reuse the same codebase while keeping data and persistence separated by profile.

### Local competition switcher

The switcher appears in Settings and can jump between sites locally too.

- Default local targets are:
  - `world-cup-2026` -> `http://localhost:3001/overview`
  - `nations-championship-2026` -> `http://localhost:3002/overview`
  - `six-nations-championship-2026` -> `http://localhost:3003/overview`
  - `six-nations-championship-2025` -> `http://localhost:3003/overview#2025`
- You can override them with:
  - `NEXT_PUBLIC_WORLD_CUP_SITE_URL`
  - `NEXT_PUBLIC_NATIONS_CHAMPIONSHIP_SITE_URL`
  - `NEXT_PUBLIC_SIX_NATIONS_CHAMPIONSHIP_SITE_URL`
- Competitions that share the same championship now expose a dedicated year selector.
  - The most recent year is the default target.
  - Past years are encoded in the URL fragment using the year only (for example `#2025`).
  - On the Six Nations site, changing the year keeps you on the same host and loads the selected season dataset.

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

The repository includes all competition apps at once via `docker-compose.yml`:

- `app-world-cup` on `http://localhost:3001`
- `app-nations-championship` on `http://localhost:3002`
- `app-six-nations-championship` on `http://localhost:3003`
- shared `mongo`
- `cron-world-cup` (local sync runner)
- `cron-nations-championship` (local sync runner)
- `cron-six-nations-championship` (local sync runner)

1. Copy `.env.docker.example` to `.env` and adjust values.
2. Start:

```bash
docker compose up --build
```

Notes:
- World Cup app runs on `http://localhost:${WORLD_CUP_APP_PORT:-3001}`
- Nations Championship app runs on `http://localhost:${NATIONS_CHAMPIONSHIP_APP_PORT:-3002}`
- Six Nations Championship app runs on `http://localhost:${SIX_NATIONS_CHAMPIONSHIP_APP_PORT:-3003}`
- Mongo is exposed at `localhost:${MONGODB_PORT:-27018}`
- Source is bind-mounted for live reload (polling enabled for Docker Desktop reliability)
- All competition cron services are enabled by default.

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
