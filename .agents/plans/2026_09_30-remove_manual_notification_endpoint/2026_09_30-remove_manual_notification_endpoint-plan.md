---
name: "Remove manual notification endpoint"
description: "Delete the broken, unused endpoints that let a caller trigger the licence expiration mass email"
created_at: "2026-09-30T13:00:00Z"

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

last_implementation_at: "2026-09-30T13:20:00Z"
has_completed_all_phases: "true"
---

# Remove manual notification endpoint

## 🎯 Goal

Delete `POST /api/v1/notifications/send-expiration-reminders` and `GET /api/v1/notifications/scheduler-status`. They answer 500 to every caller, gate on a role that does not exist, and no client calls them; removing them leaves the daily scheduler as the only way to send the licence expiration mass email.

## 👀 Context

- [`backend/src/infrastructure/web/routers/notifications.py`](../../../backend/src/infrastructure/web/routers/notifications.py): both routes and their inline DTOs `NotificationJobResult` and `SchedulerStatus`. The role check calls `current_user.get("role")` on a `User` dataclass (AttributeError, 500) and compares it to `association_admin`, which is not a role in the two-level model.
- [`backend/src/app.py`](../../../backend/src/app.py): imports and registers the router; defines `get_scheduler()` and the `_scheduler` global used only by the router and the lifespan.
- [`backend/src/infrastructure/scheduler/notification_scheduler.py`](../../../backend/src/infrastructure/scheduler/notification_scheduler.py): `run_now()` is called only by the router.
- No frontend, mobile, script or test references the routes.
- Docs: [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md), [`docs/security/security-guidelines.md`](../../../docs/security/security-guidelines.md), [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md).

## 🪜 Phases

### Phase 1: Remove the endpoints

Delete the routes and the code only they used, keeping the daily scheduler's start and stop unchanged.

Public contracts:

- HTTP endpoints deleted: `POST /api/v1/notifications/send-expiration-reminders`, `GET /api/v1/notifications/scheduler-status`, with DTOs `NotificationJobResult` and `SchedulerStatus`.
- Deleted: `src.app.get_scheduler()` and `NotificationScheduler.run_now()`. `_scheduler` becomes a local of `lifespan`.
- Test suite `tests/infrastructure/web/test_notifications_routes_removed.py`:
  - neither path is in the OpenAPI schema
  - POST to the reminders path answers 404

To-do:

- [x] Write the test suite above and see it fail.
- [x] Delete the router file and its registration in `app.py`, `get_scheduler()` and `run_now()`; make `_scheduler` a local of `lifespan`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd backend && poetry run pytest`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

All phases are complete: merge the branch.

Attack surface trimmed by 🚪 < 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
