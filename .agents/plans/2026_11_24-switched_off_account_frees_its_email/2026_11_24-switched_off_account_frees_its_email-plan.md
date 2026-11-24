---
name: "Switched-off account frees its email"
description: "Giving access with an email held by a switched-off account hands that account over, and the Acceso badge counts only active accounts"
created_at: "2026-11-24T11:30:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Fable"
    version: "5.2"
    reasoning_effort: "low"
---

# Switched-off account frees its email

## Goal

A club changes its manager and keeps the club email. Giving access with an email that only a switched-off account holds must work, and the "Acceso" badge must stop marking members whose account is switched off.

## Context

Reported 2026-11-24 by the federation secretary on a club that changed manager: the panel answered "Ese correo ya lo usa otra cuenta" and the former manager kept the "Acceso" badge.

Root causes:

- [`grant_member_access_use_case.py`](../../../backend/src/application/use_cases/member_access/grant_member_access_use_case.py) refuses any email another account holds, switched off or not. Removing access ([`switch_off_login.py`](../../../backend/src/application/use_cases/member_access/switch_off_login.py)) deactivates the account and keeps its email.
- [`useMembersWithAccountQuery.ts`](../../../frontend/src/features/users/hooks/queries/useMembersWithAccountQuery.ts) counts every account with a `member_id`, ignoring `is_active`.
- [`useGrantMemberAccessMutation.ts`](../../../frontend/src/features/users/hooks/mutations/useGrantMemberAccessMutation.ts) and [`useRevokeMemberAccessMutation.ts`](../../../frontend/src/features/users/hooks/mutations/useRevokeMemberAccessMutation.ts) never invalidate `['user-accounts']` (stale for 5 minutes).

Decision agreed with the owner: the email identifies the person. A switched-off, non super admin account holding the email is handed over to the member being given access (`User.link_to_member`), reactivated with a new random password, in any club. Access derives from the new member's club, so nothing is gained over the old one.

Matrix of real varieties (production, read-only, 2026-11-24):

| Case | Count | Expected |
|---|---|---|
| Switched-off account of an active member, same club | 1 | handed over |
| Switched-off account of a "(Club Admin)" placeholder of a deregistered club | 5 | handed over, even from another club |
| Email held by an active account | 150 | refused, as today |
| Super admin account | 1 (active) | always refused |
| Member has its own switched-off account and the email sits on another switched-off one | 0 | email holder is used, the member's old account is unlinked |
| Emails shared by two accounts | 0 | n/a |

Docs: [`club-admins-manage-member-access.md`](../../../docs/domain/club-admins-manage-member-access.md), [`fixtures-are-real-entities.md`](../../../docs/testing/fixtures-are-real-entities.md), [`backend.md`](../../../docs/conventions/backend.md), [`frontend.md`](../../../docs/conventions/frontend.md).

Out of scope: `UpdateUserEmailUseCase` still refuses an email held by a switched-off account; one member with two active accounts in production.

## Phases

### Phase 1: the email of a switched-off account can be given again

`GrantMemberAccessUseCase.execute(member_id, email, make_club_admin, issued_by)` keeps its signature. No endpoint, DTO, copy or collection change.

Test cases added to `TestGrantMemberAccessUseCase`:

- `test_hands_over_a_switched_off_account_holding_the_email`
- `test_refuses_an_email_an_active_account_uses` (renames `test_refuses_an_email_another_account_uses`)
- `test_refuses_the_email_of_a_switched_off_super_admin`
- `test_unlinks_the_members_own_switched_off_account_when_another_holds_the_email`

- [ ] Write the failing tests
- [ ] Hand over the switched-off holder in the use case
- [ ] Extend `docs/domain/club-admins-manage-member-access.md`
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: the "Acceso" badge tells the truth

Test cases:

- `useMembersWithAccountQuery.test.tsx`: `ignores switched-off accounts`
- `useAccessMutationsRefreshAccounts.test.tsx` (new): `refreshes the accounts after giving access`, `refreshes the accounts after removing access`

- [ ] Write the failing tests
- [ ] Count only active accounts in `useMembersWithAccountQuery`
- [ ] Invalidate `['user-accounts']` after grant and revoke, and every `['user-by-member']` after grant
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

Plan paddled into shape by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
