---
name: "Fix scheduler month rollover"
description: "Stop the notification scheduler from crashing on the last day of each month (Sentry SPAIN-AIKIKAI-2)"
created_at: "2026-09-30T12:00:00Z"

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

last_implementation_at: "2026-09-30T12:30:00Z"
has_completed_all_phases: "true"
---

# Fix scheduler month rollover

## 🎯 Goal

Stop the licence notification scheduler from raising `ValueError: day is out of range for month` on the last day of each month (Sentry SPAIN-AIKIKAI-2) by computing the next daily run with `timedelta` instead of `replace(day=day + 1)`.

## 👀 Context

- [`backend/src/infrastructure/scheduler/notification_scheduler.py`](../../../backend/src/infrastructure/scheduler/notification_scheduler.py): `_scheduler_loop` computes the next run with `target_time.replace(day=target_time.day + 1)`. On the last day of a month, after the run time, this raises; the loop catches it, sleeps 60 seconds and retries until midnight UTC (197 events on 2026-09-30).
- [`backend/src/app.py`](../../../backend/src/app.py): lifespan starts and stops the scheduler via `create_notification_scheduler()`.
- No other date arithmetic in `backend/src` or `backend/scripts` has this failure mode; the notification use case already uses `timedelta`.
- No scheduler tests exist yet. Tests are marked `pytest.mark.unit`; `asyncio_mode = "auto"`.
- Docs: [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md), [`docs/conventions/backend.md`](../../../docs/conventions/backend.md), [`docs/domain/data-model.md`](../../../docs/domain/data-model.md) (naive UTC datetimes).

## 🪜 Phases

### Phase 1: Correct next-run calculation

Extract the next-run calculation into a testable method that rolls over month and year ends.

Public contracts:

- `NotificationScheduler._next_run(now: datetime) -> datetime` (new, used by `_scheduler_loop`).
- Test suite `tests/infrastructure/scheduler/test_notification_scheduler.py`:
  - before run time returns the same day
  - after run time returns the next day
  - 30 September rolls over to 1 October
  - 28 February rolls over to 1 March
  - 31 December rolls over to 1 January of the next year

To-do:

- [x] Write the test suite above and see it fail.
- [x] Add `_next_run` using `+= timedelta(days=1)` and call it from `_scheduler_loop`; drop the unused `time` import.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd backend && poetry run pytest`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

All phases are complete: merge the branch and resolve SPAIN-AIKIKAI-2 once deployed.

Month ends tamed by 📅 < 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
