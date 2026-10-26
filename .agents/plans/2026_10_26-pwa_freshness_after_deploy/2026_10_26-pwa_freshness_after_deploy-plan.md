---
name: "PWA freshness after deploy"
description: "Tell users of the installed admin web that a new version is deployed, and keep stale lazy chunks from breaking the app."
created_at: "2026-10-26T12:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"

last_implementation_at: "2026-10-26T15:20:00Z"
has_completed_all_phases: "true"
---

# PWA freshness after deploy

## 🎯 Goal

After a deploy, users who keep the admin web open (or installed as a PWA) are offered a reload instead of running old code, and navigating to a lazy page whose chunk no longer exists reloads the app on every deploy, not only the first one.

## 👀 Context

- No service worker exists; the PWA is only [`frontend/public/manifest.webmanifest`](../../../frontend/public/manifest.webmanifest). This plan keeps it that way.
- [`frontend/nginx.conf`](../../../frontend/nginx.conf): hashed assets are cached for a year, but `index.html` has no `Cache-Control`, so browsers may cache it heuristically.
- [`frontend/src/App.tsx`](../../../frontend/src/App.tsx): `lazyWithRetry` reloads once on a chunk failure, but never clears its `chunk_reload` flag after a successful load, so a second stale deploy in the same tab throws. The global `Toaster` (sonner) is mounted here.
- No build id exists. Each Vite build renames the entry script (`/assets/index-<hash>.js`), so comparing the entry script of the live `index.html` with the loaded one detects a deploy without any build plumbing.
- Docs: [`docs/architecture/frontend-features.md`](../../../docs/architecture/frontend-features.md) (shared hooks in `src/core/hooks/`), [`docs/conventions/frontend.md`](../../../docs/conventions/frontend.md).
- Real-data matrix: not applicable, the change does not depend on club data.

## 🪜 Phases

### Phase 1: new version notice and no-cache index.html

Show a persistent toast with a reload action when the tab becomes visible and the deployed entry script differs from the loaded one.

- [x] `nginx.conf`: `location = /index.html` with `Cache-Control: no-cache`.
- [x] Create `src/core/hooks/useNewVersionNotice.ts`: on `visibilitychange` to visible, fetch `/index.html` with `cache: "no-store"`, compare its entry script with the loaded one, and show the toast once (`id: "new-version"`, `duration: Infinity`).
- [x] Call `useNewVersionNotice()` once in `App.tsx`.
- [x] Spanish copy: "Hay una nueva versión disponible", action "Recargar".
- [x] Test suite `src/core/hooks/__tests__/useNewVersionNotice.test.ts`:
  - shows the notice when the deployed entry script differs
  - does not show the notice when it is the same
  - does not show the notice when the fetch fails
  - does not check while the tab is hidden
  - the "Recargar" action reloads the page
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: lazyWithRetry recovers on every deploy

Move `lazyWithRetry` to `src/core/utils/` and clear the reload flag once a chunk loads.

- [x] Create `src/core/utils/lazyWithRetry.ts` from the function in `App.tsx`, clearing `chunk_reload` after a successful import.
- [x] Import it in `App.tsx`.
- [x] Test suite `src/core/utils/__tests__/lazyWithRetry.test.ts`:
  - the first failure reloads the page
  - a second consecutive failure throws the error
  - after a successful load, a new failure reloads again
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

All phases are implemented; review and merge the branch.

Fresh code on every deploy, the old tab hears the bell and catches the turtle, and no broken chunk trips it up again: 🔔 🐢 💨 🧩 (Turbotuga™, [Codely](https://codely.com)'s mascot).
