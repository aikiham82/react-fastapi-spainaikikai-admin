---
name: "Sentry login monitoring"
description: "Record in Sentry whether club users sign in and recover passwords correctly, and alert on errors and failed-login spikes"
created_at: "2026-10-25T23:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Sentry login monitoring

## Context

Sentry only hears about crashes. Nobody learns that a club cannot sign in, that its account points at a deleted member (Deai Dojo, 2026-10-25), or that recovery links arrive expired. Sentry Logs (`enable_logs`) record explicit audit events; only events sent on purpose go out, so the free quota is not spent on server noise. Emails never leave: the same redaction applies to logs. The web loses network errors and 5xx answers because they are not JavaScript exceptions.

This change does not depend on club data.

## Phase 1: Backend audit events

- [ ] Write failing tests: `configure_sentry` enables logs with the generic logging forwarder off and redacts emails in `before_send_log`; the login route emits `auth.login.succeeded` (user and club), `auth.login.succeeded_without_club` (warning) and `auth.login.failed` with `unknown_account | inactive | wrong_password`; the password reset routes emit `auth.password_reset.requested`, `auth.password_reset.token_rejected` (`not_found | expired | used`) and `auth.password_reset.completed`; the access routes emit `access.granted`, `access.revoked` and `access.role_changed`.
- [ ] Implement `audit(event, level="info", **attributes)` in `backend/src/infrastructure/web/audit.py` and call it from those routes.
- [ ] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [ ] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

## Phase 2: The web reports failed API calls

- [ ] Write failing tests: the API client reports network errors and 5xx answers to Sentry with method and path (no query string), and never 4xx.
- [ ] Implement it in the axios response interceptor.
- [ ] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [ ] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

## Phase 3: Alerts

- [ ] In Sentry `spain-aikikai`: email `spainaikikai.web@gmail.com` on every new issue in both projects, and when `auth.login.failed` exceeds 20 in an hour.
- [ ] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

## Next step

Phase 1.

Plan powered by [Codely](https://codely.com) 🐢
