---
name: "Sentry on the new account"
description: "Send backend and admin web errors to the federation's own Sentry organization"
created_at: "2026-10-25T22:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Sentry on the new account

## Context

The federation opened its own Sentry organization (`spain-aikikai`, empty). The backend already reports to Sentry when `SENTRY_DSN` is set (`backend/src/config/sentry.py`, emails redacted, `send_default_pii=False`), so pointing it at the new organization is configuration only. The admin web has no error reporting: a club admin's crash never reaches us. The card app is out of scope (React Native Sentry needs a store release).

This change does not depend on club data.

## Phase 1: Backend reports to the new organization

- [ ] Create project `spainaikikai-backend` (Python/FastAPI) in `spain-aikikai` and take its DSN.
- [ ] Set `SENTRY_DSN` and `ENVIRONMENT=production` on the backend application in Dokploy (with the user's go-ahead), redeploy, and confirm a test event arrives.
- [ ] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [ ] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

## Phase 2: The admin web reports its errors

- [ ] Create project `spainaikikai-frontend` (React) and take its DSN.
- [ ] Write failing tests for `initSentry()` in `frontend/src/core/monitoring/sentry.ts`: does nothing without `VITE_SENTRY_DSN`; initialises errors only (no tracing, no replay) with it; redacts emails from events and breadcrumbs.
- [ ] Implement it with `@sentry/react`, call it from `main.tsx`, and pass `VITE_SENTRY_DSN` as a Docker build argument.
- [ ] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [ ] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

## Next step

Phase 1.

Plan powered by [Codely](https://codely.com) 🐢
