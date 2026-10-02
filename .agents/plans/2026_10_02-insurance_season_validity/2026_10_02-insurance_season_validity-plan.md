---
name: "Insurance season validity"
description: "Give insurances the 1 October to 30 September season instead of the calendar year, and derive the reported status from the end date."
created_at: "2026-10-02T00:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Insurance season validity

## 🎯 Goal

An insurance paid for year N must be valid from 1 October N-1 to 30 September N, not from 1 January to 31 December. The status reported for an insurance must follow its end date, so a policy stored as `active` whose season is over is reported as `expired`.

## 👀 Context

Root cause, established with systematic debugging: the validity window is hardcoded to the calendar year in two writers, and nothing ever moves the stored `status` away from `active`.

- [`backend/src/application/use_cases/insurance/generate_insurance_from_payment_use_case.py`](../../../backend/src/application/use_cases/insurance/generate_insurance_from_payment_use_case.py): lines 43-44 build `datetime(payment_year, 1, 1)` and `datetime(payment_year, 12, 31, 23, 59, 59)`.
- [`backend/scripts/sync/planner.py`](../../../backend/scripts/sync/planner.py): lines 338-339 and 357-358 do the same for the Excel import. Licences (lines 280-281) legitimately stay on the calendar year.
- [`backend/src/infrastructure/adapters/repositories/mongodb_insurance_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_insurance_repository.py): `find_active_by_member_year_type` uses the same calendar window for idempotency, and `find_expiring_soon` has no lower bound.
- [`backend/src/domain/entities/insurance.py`](../../../backend/src/domain/entities/insurance.py): `is_expired()` exists but compares against `datetime.now()`, and no reader uses it.
- [`backend/src/infrastructure/web/mappers_insurance.py`](../../../backend/src/infrastructure/web/mappers_insurance.py): `to_response_dto` returns the stored status.
- [`backend/src/infrastructure/web/routers/members.py`](../../../backend/src/infrastructure/web/routers/members.py): `_best_status` reads the stored status for the member list summary.
- [`backend/src/infrastructure/web/routers/import_export.py`](../../../backend/src/infrastructure/web/routers/import_export.py): the export filters on the stored status.
- [`backend/scripts/sync/writer.py`](../../../backend/scripts/sync/writer.py): the upsert key includes `start_date`, so the importer must not be re-run against production until the existing documents are migrated.
- The frontend already renders `expired` as "Expirada" in [`InsuranceList.tsx`](../../../frontend/src/features/insurance/components/InsuranceList.tsx). No frontend change is needed.

Decisions taken with the user:

- Payment year N maps to the season 1 October N-1 to 30 September N.
- Status is derived when reading, not persisted by a scheduled job.
- Production data is not touched by this plan. A dry-run report follows for approval.

Documentation to follow:

- [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md): insurance is its own cycle.
- [`docs/domain/data-model.md`](../../../docs/domain/data-model.md): naive datetimes, `datetime.utcnow()`.
- [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md) and [`docs/conventions/backend.md`](../../../docs/conventions/backend.md).
- [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md) and [`docs/testing/no-production-data.md`](../../../docs/testing/no-production-data.md).

## 🪜 Phases

### Phase 1: season validity window

New insurances, whether created by a payment in the app or by the Excel import, carry the October to September season, and the idempotency lookup searches that same window.

Public contracts:

- Domain: new `insurance_season(payment_year: int) -> tuple[datetime, datetime]` in `domain/entities/insurance.py`, returning naive `(datetime(N-1, 10, 1), datetime(N, 9, 30, 23, 59, 59))`.
- Use case: `GenerateInsuranceFromPaymentUseCase.execute` keeps its signature and uses the season.
- Repository: `MongoDBInsuranceRepository.find_active_by_member_year_type` keeps its signature and matches the season window.
- Import script: `scripts/sync/planner.py` emits the season for accident and civil liability insurances. Licences are unchanged.
- Test suites:
  - `tests/domain/insurance/test_insurance_season.py` (new): year 2026 gives 2025-10-01 to 2026-09-30 23:59:59; both datetimes are naive; start is before end.
  - `tests/application/use_cases/insurance/test_generate_insurance_from_payment_use_case.py`: expected dates for accident and civil liability move to the season.
  - `tests/scripts/test_planner.py`: imported insurances carry the season; the licence keeps 1 January to 31 December.
  - `tests/infrastructure/adapters/repositories/test_mongodb_insurance_repository.py` (new): finds an insurance of the requested season; does not find one of the previous season.

To-do:

- [ ] Write the failing tests listed above.
- [ ] Add `insurance_season` to the domain.
- [ ] Use it in `GenerateInsuranceFromPaymentUseCase`.
- [ ] Use it in `find_active_by_member_year_type`.
- [ ] Use it in `scripts/sync/planner.py` for both insurance types.
- [ ] Update [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md) with the exact window and the mapping from payment year.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: status derived from the end date

Every reader reports an insurance as expired once its end date has passed, even though the stored status still says `active`.

Public contracts:

- Domain: new `Insurance.effective_status` property, `EXPIRED` when the stored status is `ACTIVE` and the end date has passed, the stored status otherwise. `Insurance.is_expired` compares against `datetime.utcnow()`.
- HTTP: `InsuranceResponse.status` on `GET /insurances`, `GET /insurances/{id}` and `GET /insurances/member/{id}` returns the effective status. Paths, parameters and DTO fields are unchanged.
- HTTP: the insurance summary on the member list counts only effectively active insurances.
- HTTP: the insurance export `status` filter compares the effective status.
- Repository: `find_expiring_soon` only returns insurances whose end date is still in the future.
- Test suites:
  - `tests/domain/insurance/test_insurance_entity.py`: active with past end date is `expired`; active with future end date is `active`; cancelled with past end date stays `cancelled`; no end date returns the stored status.
  - Mapper test: the response carries `expired` for an insurance stored as active whose end date has passed.
  - Member list summary test: an expired insurance is not counted as active.
  - `tests/infrastructure/adapters/repositories/test_mongodb_insurance_repository.py`: `find_expiring_soon` leaves out insurances that already expired.

To-do:

- [ ] Write the failing tests listed above.
- [ ] Add `effective_status` and switch `is_expired` to `datetime.utcnow()`.
- [ ] Return the effective status from `InsuranceMapper.to_response_dto`.
- [ ] Use the effective status in the member list summary and in the export filter.
- [ ] Add the lower bound to `find_expiring_soon`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 1, the season validity window.

Seasons change, shells do not: plan carried over the line by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
