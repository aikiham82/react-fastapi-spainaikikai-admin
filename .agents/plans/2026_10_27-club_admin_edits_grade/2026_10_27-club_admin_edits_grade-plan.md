---
name: "club_admin_edits_grade"
description: "A club admin changes the kyu/dan number of a member of their club from Editar miembro, and the member list shows the instructor title even when it lives on a separate licence."
created_at: "2026-10-27T14:19:53Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Club admin edits a member's grade

## 🎯 Goal

A club admin (and the super admin) changes the kyu or dan number of a member of their club from the "Editar miembro" dialog, writing it to the member's current grade licence. Moving from kyu to dan and the instructor title (Shidoin, Fukushidoin) stay with the federation. The member list shows the title even when the grade and the title are stored on two separate licences.

## 👀 Context

Reported 2026-10-27 by Muzen Dojo through the federation: club managers cannot find where to change kyus, and some titles do not show in the member list.

Root cause:

- Grade and title live on the `License`, not the `Member`. Club admins only read licences: [`usePermissions.ts`](../../../frontend/src/core/hooks/usePermissions.ts) and `require_super_admin` in [`licenses.py`](../../../backend/src/infrastructure/web/routers/licenses.py) `PUT /{license_id}`.
- [`members.py`](../../../backend/src/infrastructure/web/routers/members.py) `_pick_primary_license` / `_build_license_summary` pick one licence, so a member with "5º Dan" (none) and "Shidoin" (shidoin) licences with the same expiry may show no title.

Why only the number: the licence price key is `technical_grade-instructor_category-age_category` ([`license.py`](../../../backend/src/domain/entities/license.py)), so the number does not change the price; kyu to dan does (paid "Licencia Dan").

Files:

- Backend: [`routers/members.py`](../../../backend/src/infrastructure/web/routers/members.py) (`_load_member_in_callers_club`, summaries), [`authorization.py`](../../../backend/src/infrastructure/web/authorization.py), [`domain/entities/license.py`](../../../backend/src/domain/entities/license.py) (`update_grade`), [`use_cases/license/`](../../../backend/src/application/use_cases/license/), [`dependencies`](../../../backend/src/infrastructure/web/) wiring, tests in [`backend/tests/api/`](../../../backend/tests/api/) with `client_as`, `club_admin()`, `super_admin()`.
- Frontend: [`MemberForm.tsx`](../../../frontend/src/features/members/components/MemberForm.tsx), [`member.service.ts`](../../../frontend/src/features/members/data/services/), member mutations, [`core/utils/grade.ts`](../../../frontend/src/core/utils/grade.ts) (`formatGradeNumber`), tests in `features/members/components/__tests__/MemberForm.test.tsx`.

Docs: [`backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md), [`update-use-cases-take-named-fields.md`](../../../docs/conventions/update-use-cases-take-named-fields.md), [`roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md), [`club-admins-manage-member-access.md`](../../../docs/domain/club-admins-manage-member-access.md), [`fixtures-are-real-entities.md`](../../../docs/testing/fixtures-are-real-entities.md), [`no-production-data.md`](../../../docs/testing/no-production-data.md), [`frontend.md`](../../../docs/conventions/frontend.md), [`ui-visual-language.md`](../../../docs/conventions/ui-visual-language.md).

### Real-data matrix (production licences, read-only query 2026-10-27)

| Variety | Example | Expected |
|---|---|---|
| Numbered kyu | 6º Kyu → 4 | grade "4º Kyu" |
| Numbered dan, both spellings | "1er Dan", "1º Dan" → 3 | grade "3º Dan" |
| Generic grade (31 members) | "Kyu", "Kyu Infantil", "Dan" | number can be set, kind kept |
| Grade and title on two licences (5 members) | "5º Dan" + "Shidoin" | grade licence changes, title licence untouched |
| Title-only licence | grade "Shidoin" (dan, shidoin) | becomes "5º Dan", title kept |
| No licence | - | field disabled, 404 from the API |
| Foreign club / plain member | - | 403 |
| Out of range | kyu 0 or 7, dan 11 | 422 |

Ranges: kyu 1-6 (infantil included), dan 1-10.

## 🪜 Phases

### Phase 1: change the grade from Editar miembro

Description: end-to-end happy path plus guards. New member-scoped endpoint so the licence endpoint stays super-admin only.

Public contracts:

- Use case `ChangeMemberGradeUseCase.execute(member_id: str, grade_number: int) -> License`: picks the member's active grade licence (latest expiry, skipping title-only licences unless it is the only one), keeps `technical_grade`, validates range, writes `"{n}º Kyu|Dan"`. Raises `LicenseNotFoundError` without licence, `ValidationError` out of range.
- Endpoint `PUT /api/v1/members/{member_id}/grade`, body `{ "grade_number": int }`, response `MemberResponse` enriched with summaries. Club admin of that club or super admin.
- Frontend service `changeMemberGrade(memberId: string, gradeNumber: number): Promise<Member>` and its mutation, invalidating `['members']`.
- Copy: label «Grado»; hint «El paso de kyu a dan y los títulos de Shidoin y Fukushidoin los gestiona la federación.»; without licence «Este socio aún no tiene licencia.»
- Test suites:
  - `test_change_member_grade_use_case.py`: one case per matrix row (numbered kyu, both dan spellings, generic grade, split grade/title picks the grade licence, title-only licence keeps title, no licence raises, out of range raises).
  - `tests/api/test_member_grade.py`: club admin changes their member's grade; foreign club refused; plain member refused; super admin changes any; out of range 422; no licence 404.
  - `MemberForm.test.tsx`: offers only numbers of the current kind; sends the changed grade; does not call the API when unchanged; disabled without licence.

To-do:

- [ ] Write failing use-case tests, implement `ChangeMemberGradeUseCase`, wire its dependency.
- [ ] Write failing router tests, add the endpoint with `_load_member_in_callers_club` and a request DTO.
- [ ] Write failing `MemberForm` tests, add service, mutation and the «Grado» select.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: the list shows the title stored on another licence

Description: `_build_license_summary` takes the grade from the grade licence and the title from any active licence of the member (Shidoin over Fukushidoin).

Public contracts:

- Test suite `tests/api/test_member_license_summary.py`: "5º Dan" + "Shidoin" licences show both; a single licence keeps its grade and title; no licence gives no summary.

To-do:

- [ ] Write failing summary tests, change `_build_license_summary` to merge grade and title.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 1: the grade select in Editar miembro backed by `PUT /members/{id}/grade`.

Belts tied tight by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
