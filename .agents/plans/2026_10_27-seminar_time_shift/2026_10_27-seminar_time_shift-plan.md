---
name: "2026_10_27-seminar_time_shift"
description: "Stop seminar times from moving one or two hours earlier on display and on every save."
created_at: "2026-10-27T08:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Seminar times shift on every save

## 🎯 Goal

Show seminar times in the user's local time and keep them unchanged when a seminar is edited and saved.

## 👀 Context

### Root cause

- [`SeminarForm.tsx`](../../../frontend/src/features/seminars/components/SeminarForm.tsx) sends `new Date(local).toISOString()`, a UTC instant (10:00 Madrid in winter is `09:00Z`). Correct.
- The backend stores it as a naive UTC datetime (Mongo stores naive UTC, see [`docs/domain/data-model.md`](../../../docs/domain/data-model.md)) and returns it **without an offset**: `"2026-10-31T09:00:00"`.
- The frontend parses that string as **local** time: it shows 09:00, the edit form is refilled with `slice(0, 16)` = 09:00, and saving sends `08:00Z`. Every save moves the seminar one hour earlier in winter, two in summer.
- [`MemberAccessAccount.tsx`](../../../frontend/src/features/users/components/MemberAccessAccount.tsx) already reads naive API datetimes as UTC by appending `Z`; seminars did not.

Production data (read-only, 10 seminars) is stored correctly as UTC. No data or backend change is needed.

### Real data varieties

| Case | Stored (UTC) | Expected in Europe/Madrid |
|---|---|---|
| Winter (+1) | `2026-10-31T09:00:00` | 10:00 |
| Summer (+2) | `2026-07-11T06:00:00` | 08:00 |
| Spans the DST change | `2026-10-24T08:00:00` to `2026-10-26T09:00:00` | 10:00 and 10:00 |
| Edit and save without changes | any of the above | same instant sent back |
| Local midnight | `2026-05-22T22:00:00` | 23/05 00:00 |
| Already has an offset | `2026-10-31T09:00:00Z` | 10:00, no double `Z` |

### Out of scope

- The dashboard receives the next seminar date already cut to a UTC day by the backend (`dashboard.py:186`); it is wrong only for seminars before 02:00 local, and production has none.
- Seminars edited before this fix may already have lost hours; they cannot be told apart automatically.

## 🪜 Phases

### Phase 1: Read API seminar datetimes as UTC

- [ ] `frontend/src/core/utils/format.ts`: `parseUtcDateTime(value)` (naive string with time read as UTC; strings with `Z` or an offset kept; date-only strings stay local calendar dates) and `toDateTimeLocalInput(value)` (UTC instant to the `YYYY-MM-DDTHH:mm` local value a `datetime-local` input needs).
- [ ] `SeminarForm.tsx`: refill `start_date` and `end_date` with `toDateTimeLocalInput`.
- [ ] `seminarDates.ts` and the seminar row and detail: parse with `parseUtcDateTime` for past checks, ordering, date block, time label and displayed dates.
- [ ] Tests (run with `TZ=Europe/Madrid`):
  - `format.test.ts`: `reads a naive API datetime as UTC`, `keeps an explicit offset`, `keeps a date-only string on its calendar day`, `turns a UTC instant into a local datetime-local value` (winter, summer, local midnight).
  - `SeminarForm.test.tsx`: `sends back the same instant when an edited seminar is saved unchanged` (winter and summer).
  - `seminarDates.test.ts`: `shows the local start time of a winter and a summer seminar`, `keeps both ends right across the DST change`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 1.

Time kept on the clock by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
