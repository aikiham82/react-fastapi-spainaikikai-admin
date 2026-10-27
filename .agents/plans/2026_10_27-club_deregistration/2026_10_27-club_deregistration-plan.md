---
name: "Club deregistration"
description: "A super admin deregisters a club: the club, every member of it and every login of those members are switched off."
created_at: "2026-10-27T10:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Club deregistration

## 🎯 Goal

A super admin can deregister a club that has left the federation. The club record (when it exists) becomes inactive, every member with that `club_id` becomes inactive, and every account linked to those members is deactivated with its reset links killed, so nobody of that club signs in to the panel or the card app.

## 👀 Context

- `Club.is_active` and `Club.deactivate()` exist ([`club.py`](../../../backend/src/domain/entities/club.py)); `ClubUpdate` accepts `is_active` but nothing in the panel sets it and nothing reads it at sign in.
- 185 members of 12 clubs point to a `club_id` missing from `clubs`, so deregistration works on the `club_id` even without a club record.
- Club accounts and their list: [`docs/domain/club-accounts-pass-to-a-person.md`](../../../docs/domain/club-accounts-pass-to-a-person.md), [`ClubAccountsSection.tsx`](../../../frontend/src/features/clubs/components/ClubAccountsSection.tsx). An inactive account drops out of that list.
- Access rules: [`docs/domain/club-admins-manage-member-access.md`](../../../docs/domain/club-admins-manage-member-access.md) (revoking kills reset tokens).
- Decisions (owner, 2026-10-27): members of a deregistered club become inactive; all their logins are deactivated, not only the club account.

### Real production varieties (read-only query, 2026-10-27)

| Club | Club record | Members | Active logins |
|---|---|---|---|
| Aikido Ciudad Real | missing | 4 active | 1 (club account) |
| Elemental Aikido Azuqueca | missing | 0 | 1 |
| Aikido Kitai Almuñécar | active | 4 active | 1 |
| Aikido Musubi Almería | active | 0 | 1 |
| Onlybudo | active | 0 | 1 |

Plus: a member with a personal login (deactivated too), pending reset links (killed), unknown `club_id` with no record and no members (404).

## 🪜 Phases

### Phase 1: deregister a club from "Cuentas de club sin persona"

Public contracts:

- Use case: `DeregisterClubUseCase.execute(club_id: str) -> DeregisteredClub` (`members: int`, `accounts: int`).
- HTTP: `POST /api/v1/clubs/{club_id}/deregister`, super admin only, response `{ "members": int, "accounts": int }`; 404 when there is neither a club record nor a member with that `club_id`.
- Admin copy: button "Dar de baja el club"; confirmation "{club} y sus {n} socios pasarán a baja y nadie del club podrá entrar en la web ni en la app."; toast "Club dado de baja".
- Tests: use case suite (record + members + logins; record missing; no members; personal login deactivated; reset tokens killed; unknown club 404); router suite (super admin 200, club admin 403, 404); vitest for the row button and confirmation.

- [ ] Write the failing tests.
- [ ] Implement the use case, wiring and endpoint.
- [ ] Admin: service, mutation and the button in each club account row.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: deregister any club from the Clubs page

Public contracts:

- Admin copy: club card action "Dar de baja" (same confirmation and toast); badge "De baja" on inactive clubs.
- Tests: vitest for the action (super admin only) and the badge.

- [ ] Write the failing tests.
- [ ] Add the action and the badge to the club card, reusing phase 1's mutation.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 1: deregister a club from "Cuentas de club sin persona".

Closing the dojo doors gently, by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
