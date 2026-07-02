# Football World Cup - Copilot Instructions

## Project summary

- Next.js App Router app with TypeScript.
- UI and routes are under `src/app`, `src/components`, and `src/views`.
- Server/data logic is under `src/server`.
- Shared domain utilities are under `src/lib`.

## Required development workflow

1. Keep changes scoped to the user request.
2. Reuse existing helpers in `src/lib` and `src/server` instead of duplicating logic.
3. Preserve strict TypeScript safety; avoid `any` and broad assertions.
4. After code changes, run:
   - `npm run lint`
   - `npm test`
   - `npm run build`

## API and data rules

- API handlers live in `src/app/api/**/route.ts`.
- Return explicit, typed JSON payloads with appropriate status codes.
- Do not silently swallow errors in route handlers or server functions.
- Keep tournament sync behavior compatible with current status values: `scheduled`, `live`, `finished`.

## Testing expectations

- Add or update tests in `tests/**/*.test.ts` when behavior changes.
- Prefer focused unit tests over broad integration assumptions.
