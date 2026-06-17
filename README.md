# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Vercel Match Sync

This project now supports a Vercel cron that runs every 5 minutes and updates match statuses in Vercel Blob storage.

### Runtime behavior

- Local development (`vite dev`) keeps using the bundled file at `src/data/worldcup.json`.
- Production loads tournament data from `GET /api/tournament`.
- The API reads from Blob (`worldcup/worldcup.json`) and falls back to the local file if Blob is not configured.

### Required Vercel environment variables

- `BLOB_READ_WRITE_TOKEN`: token for Vercel Blob read/write.
- `BLOB_OBJECT_ACCESS` (optional): `private` (default) or `public` for Blob writes.
- `MATCH_RESULTS_URL` (optional): override source URL for match result updates.
- `ESPN_LOOKBACK_DAYS` (optional): number of past days scanned on ESPN to backfill late scores for recently played matches (default: `7`).
- `CRON_SECRET` (optional): secret used for manual or external cron endpoint calls.
- `MONGODB_URI`: MongoDB connection string (MongoDB Atlas free tier works well on Vercel).
- `MONGODB_DB` (optional): database name used by the app (default: `world-cup`).
- `SESSION_SECRET`: secret used to sign auth session cookies.

Vercel scheduled cron calls are identified via the `x-vercel-cron` header and do not automatically include your custom `Authorization` header.

If `MATCH_RESULTS_URL` is not set, the cron defaults to:

- `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`

### Cron endpoint

- Path: `/api/cron/sync-matches`
- Schedule: `*/5 * * * *`

## Local Docker stack (app + MongoDB + cron)

This repository includes a local Docker Compose setup with:

- `app`: Next.js application on `http://localhost:${APP_PORT:-3000}`
- `mongo`: local MongoDB database for users/predictions/leaderboard
- `cron`: local cron runner calling `/api/cron/sync-matches` every minute (more frequent than Vercel)
- source code mounted into `app` for live reload while developing

### Start locally

1. Copy `.env.docker.example` to `.env` and adjust secrets (`APP_PORT=3001` avoids conflicts with local port 3000).
2. Start the stack:

```bash
docker compose up --build
```

### Autoreload behavior

- The `app` service mounts the project directory (`./:/app`), so code edits on host are reflected instantly in the container.
- Polling is enabled (`CHOKIDAR_USEPOLLING` and `WATCHPACK_POLLING`) to keep file watching reliable in Docker.

### Local cron schedule

- Endpoint: `POST http://app:3000/api/cron/sync-matches`
- Frequency: `* * * * *` (every minute)
- Auth header: `Authorization: Bearer $CRON_SECRET`

### Upstream payload format

The sync endpoint expects one of these JSON shapes:

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

Only known statuses are applied: `scheduled`, `live`, `finished`.
