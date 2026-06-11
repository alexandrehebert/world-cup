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
- `MATCH_RESULTS_URL`: upstream endpoint that returns match result updates.
- `CRON_SECRET` (optional): secret used for manual or external cron endpoint calls.

Vercel scheduled cron calls are identified via the `x-vercel-cron` header and do not automatically include your custom `Authorization` header.

### Cron endpoint

- Path: `/api/cron/sync-matches`
- Schedule: `*/5 * * * *`

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
