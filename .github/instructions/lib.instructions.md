---
description: "Use when editing shared domain helpers in src/lib, including bracket logic, formatting, standings, and tournament utilities."
applyTo: "src/lib/**/*.ts"
---

# Shared Library Instructions

- Keep helpers framework-agnostic and side-effect free where possible.
- Reuse existing types from `src/types` and avoid ad-hoc shape duplication.
- Preserve compatibility with existing match path and bracket conventions.
