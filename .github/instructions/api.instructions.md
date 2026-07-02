---
description: "Use when editing Next.js API route handlers under src/app/api, including auth, predictions, leaderboard, and cron endpoints."
applyTo: "src/app/api/**/*.ts"
---

# API Route Instructions

- Export handlers as `GET`, `POST`, etc. from `route.ts` files.
- Validate request payloads and query params before use.
- Return structured JSON with meaningful HTTP status codes.
- Surface errors explicitly and avoid success-shaped fallbacks.
- Keep auth/session behavior consistent with existing server auth utilities.
