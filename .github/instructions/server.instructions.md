---
description: "Use when editing server-side domain and persistence logic in src/server and shared tournament data logic."
applyTo: "src/server/**/*.ts"
---

# Server Instructions

- Prefer pure helpers where possible and isolate side effects.
- Keep Mongo and Blob access centralized in existing server modules.
- Preserve fallback behavior between remote/blob data and local canonical data.
- Use deterministic transformations for tournament data and match status updates.
