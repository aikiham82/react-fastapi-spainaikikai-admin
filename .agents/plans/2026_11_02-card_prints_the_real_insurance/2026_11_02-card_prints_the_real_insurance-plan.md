---
name: "card_prints_the_real_insurance"
description: "The card prints the end date of the member's accident insurance, not the licence's expiry"
created_at: "2026-11-02T12:30:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "high"
---

# The card prints the real insurance

## Goal

The line "VALIDEZ SEGURO ACCIDENTES" of the card prints the licence's expiry, so 462 of 518 cards in force show an accident insurance that lapsed or never existed. It must print the end date of the member's accident insurance, or "SIN SEGURO" when there is none.

## Context

- [`generate_license_image_use_case.py`](../../../backend/src/application/use_cases/license/generate_license_image_use_case.py): passes `license.expiration_date` and never reads insurances. This is the root cause.
- [`license_image_service.py`](../../../backend/src/infrastructure/adapters/services/license_image_service.py): draws it as the insurance line.
- [`license_image_service.py` port](../../../backend/src/application/ports/license_image_service.py): `LicenseImageData.expiration_date` is misnamed.
- [`insurance.py`](../../../backend/src/domain/entities/insurance.py) and [`insurance_repository.py`](../../../backend/src/application/ports/insurance_repository.py): `find_by_member_id`.
- Docs: [`payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`validity-follows-dates.md`](../../../docs/domain/validity-follows-dates.md), [`the-card-is-for-every-member-the-panel-for-managers.md`](../../../docs/domain/the-card-is-for-every-member-the-panel-for-managers.md).
- The Android app shows this same image, so it is corrected without a new release.

### Real variety matrix (production, 518 members with a licence in force, 2026-11-02)

| Members | Accident insurance | Card prints |
| --- | --- | --- |
| 399 | Only one that ended 30/09/2026 | 30/09/2026 (decided by the owner: the true date, not "SIN SEGURO") |
| 63 | None | SIN SEGURO |
| 49 | Two: the ended one and one until 30/09/2027 | 30/09/2027 |
| 7 | One until 30/09/2027 | 30/09/2027 |
| 0 today | Cancelled, or civil liability only | Ignored |

## Phases

### Phase 1: the card prints the accident insurance

Public contracts:

- `GenerateLicenseImageUseCase(license_repository, member_repository, insurance_repository, license_image_service)`.
- `LicenseImageData.expiration_date` becomes `insurance_end_date`.
- Tests: `test_generate_license_image_use_case.py`, one case per matrix row plus cancelled and civil liability ignored; `test_license_image_service.py`, the date or "SIN SEGURO".

To-do:

- [ ] Write the failing tests.
- [ ] Read the member's insurances in the use case and pick the latest end date of a non-cancelled accident insurance.
- [ ] Rename the field and draw it.
- [ ] Say it in the card doc.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

An honest card, planned with 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
