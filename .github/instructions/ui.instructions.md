---
description: "Use when editing React UI and presentation logic in src/components, src/views, src/contexts, or src/styles."
applyTo: "src/{components,views,contexts,styles}/**/*.{ts,tsx}"
---

# UI Instructions

- Keep components typed with explicit props and avoid `any`.
- Reuse existing formatting and domain helpers from `src/lib`.
- Prefer small, composable UI components over large multi-responsibility files.
- Preserve existing translation and display behavior.
