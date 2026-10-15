---
name: "Member registration date"
description: "Show and edit a member's registration date (Fecha de alta) so payment summaries and the annual prefill use a correct join year."
created_at: "2026-10-15T08:30:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Member registration date

## Goal

Let super admins and club admins see and edit a member's registration date ("Fecha de alta"), both on existing members and when creating one. Payment summaries and the annual payment prefill already count a member in a year only from that date (`Member.joined_by`), so a wrong or missing date must be correctable from the UI.

## Context

- [`backend/src/domain/entities/member.py`](../../../backend/src/domain/entities/member.py): `registration_date: Optional[datetime]`, `joined_by(year)` falls back to `created_at`.
- [`backend/src/infrastructure/web/dto/member_dto.py`](../../../backend/src/infrastructure/web/dto/member_dto.py): `MemberResponse` exposes `registration_date`; `MemberCreate` and `MemberUpdate` do not accept it.
- [`backend/src/infrastructure/web/mappers_member.py`](../../../backend/src/infrastructure/web/mappers_member.py): create always sets `datetime.utcnow()`.
- [`backend/src/infrastructure/web/routers/members.py`](../../../backend/src/infrastructure/web/routers/members.py): `PUT /members/{id}` guarded by `require_club_admin_ctx` + `_require_access_to_club`; calls `UpdateMemberUseCase.execute(member_id, **kwargs)`, which already sets any entity attribute.
- [`backend/tests/api/test_members_authorization.py`](../../../backend/tests/api/test_members_authorization.py): API test style (`client_as(ctx)`).
- [`frontend/src/features/members/components/MemberForm.tsx`](../../../frontend/src/features/members/components/MemberForm.tsx): the only member editor (create and edit dialog); `birth_date` is an `<Input type="date">` prefilled with `substring(0, 10)`.
- [`frontend/src/features/members/data/schemas/member.schema.ts`](../../../frontend/src/features/members/data/schemas/member.schema.ts): `Member`, `CreateMemberRequest`, `UpdateMemberRequest`.
- Docs: [`docs/domain/data-model.md`](../../../docs/domain/data-model.md) (naive datetimes), [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md), [`docs/conventions/backend.md`](../../../docs/conventions/backend.md), [`docs/conventions/frontend.md`](../../../docs/conventions/frontend.md), [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md).

### Real data variety (production, read-only)

| Case | Production | Expected in form |
|---|---|---|
| `registration_date` set (most app-created and Excel-imported members) | ~560 | shows that date |
| `registration_date` null, `created_at` from the 2025 migration | ~575 | shows `created_at` date |
| `registration_date` null, created by the 2026-04-17 bulk import | ~99 | shows `created_at` (2026-04-17) |
| `registration_date` far in the past (1983, 2018) | 3 | shows it unchanged |

Permissions: both super admin and club admin may edit it, club admins only for members of their own club (existing guard).

## Phases

### Phase 1: Edit the registration date of an existing member

Description: `PUT /members/{id}` accepts `registration_date`, stored naive and never in the future; the member form shows "Fecha de alta" prefilled with `registration_date ?? created_at` and sends it on save.

- [ ] `MemberUpdate.registration_date: Optional[datetime] = None`, validator converting an aware value to naive UTC and rejecting a future date (422).
- [ ] `MemberMapper.update_entity_from_dto` applies `registration_date`.
- [ ] Frontend `Member.registration_date?: string | null`; `CreateMemberRequest.registration_date?: string` (so `UpdateMemberRequest` gets it).
- [ ] `MemberForm`: date input "Fecha de alta", prefilled on edit with `(registration_date ?? created_at).substring(0, 10)`; validation message "La fecha de alta no puede ser futura".
- [ ] Tests, `backend/tests/api/test_members_registration_date.py`:
  - [ ] `test_a_club_admin_changes_the_registration_date_of_a_member_of_their_club`
  - [ ] `test_a_future_registration_date_is_rejected`
  - [ ] `test_a_club_admin_cannot_change_a_member_of_another_club`
- [ ] Tests, `frontend/src/features/members/components/__tests__/MemberForm.test.tsx`:
  - [ ] prefills "Fecha de alta" with `created_at` when `registration_date` is null
  - [ ] prefills "Fecha de alta" with `registration_date` when present
  - [ ] sends the edited `registration_date` on submit
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd backend && poetry run pytest`, `cd frontend && npm run lint && npm run build && npm run test`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: Choose the registration date when creating a member

Description: `POST /members` accepts an optional `registration_date` (defaults to today, same validation); the create form shows "Fecha de alta" defaulting to today.

- [ ] `MemberCreate.registration_date: Optional[datetime] = None` with the same validator.
- [ ] `MemberMapper` create uses the given date or `datetime.utcnow()`.
- [ ] `MemberForm` create mode defaults "Fecha de alta" to today.
- [ ] Tests, `backend/tests/api/test_members_registration_date.py`:
  - [ ] `test_a_new_member_takes_the_given_registration_date`
  - [ ] `test_a_new_member_without_registration_date_joins_today`
- [ ] Tests, `MemberForm.test.tsx`:
  - [ ] defaults "Fecha de alta" to today when creating
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1: edit the registration date of an existing member.

Join date sorted, payments in the right year, carried by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
