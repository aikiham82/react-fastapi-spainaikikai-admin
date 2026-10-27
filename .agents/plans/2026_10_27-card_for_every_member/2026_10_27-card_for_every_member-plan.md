---
name: "Card for every member"
description: "Any member with their own email activates their card in the app by themselves; the admin panel is only for club managers."
created_at: "2026-10-27T13:00:00Z"

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
last_implementation_at: "2026-10-27T14:40:00Z"
has_completed_all_phases: true
---

# Card for every member

## 🎯 Goal

Seeing the card and managing the club are two different things. Every member with an email of their own activates their card in the app without anyone granting access; the admin panel is reserved to club managers. A member with no email, or one shared with other members, needs their club manager to set one.

## 👀 Context

- Today one account serves app and panel; it is created by hand with "Dar acceso a la web" ([`GrantMemberAccessUseCase`](../../../backend/src/application/use_cases/member_access/grant_member_access_use_case.py)), and the "Puede gestionar el club" checkbox separates managers.
- Public auth endpoints answer the same whatever happened and do bounded work: [`docs/security/auth-endpoints.md`](../../../docs/security/auth-endpoints.md). Roles: [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md). Access rules: [`docs/domain/club-admins-manage-member-access.md`](../../../docs/domain/club-admins-manage-member-access.md).
- `/auth/register` creates accounts linked to no member: not usable for this.
- Owner decisions (2026-10-27): the email is the key; no email, no card until the club manager sets one; the panel is for managers only.

### Real production varieties (read-only query, 2026-10-27)

| Variety | Count | Case |
|---|---|---|
| Active members | 1052 | |
| Valid licence, no account | 388 | target |
| ... with an email of their own | 33 | activation creates account and sends link |
| ... with no email | majority | nothing created, badge "Sin correo propio" |
| Email shared by several members | 191 members | nothing created, badge |
| Member email already used as a login | 95 emails | nothing created |
| Member de baja | many | nothing created |
| Member who already has an account | 127 | nothing created (they sign in as today) |

## 🪜 Phases

### Phase 1: "Activa tu carné" in the app

Public contracts:

- Use case: `RequestCardAccessUseCase.execute(email: str) -> None`: when the email belongs to exactly one active member with no account and no login uses it, create a non-manager account for that member and mail the set-password link (reusing the grant flow); otherwise do nothing.
- Port: `MemberRepositoryPort.find_all_by_email(email) -> List[Member]`.
- HTTP: `POST /api/v1/auth/card-access/request` `{ "email": str }` → always `200 { "message": "Si tu correo está en la ficha de un socio, te llegará un enlace para activar tu carné." }`.
- App copy: link "¿Primera vez? Activa tu carné"; screen with email field, button "Enviar enlace", the same confirmation text.
- Tests: use case (one member → account + mail; shared email, member with account, email used as login, unknown email, member de baja → nothing); router (same 200 body in every case); app typecheck.

- [x] Write the failing tests.
- [x] Implement port method, use case, endpoint.
- [x] App: activation screen and link from the login screen.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: the panel is for managers only

Public contracts:

- Admin copy: a signed-in member who is not a manager sees "El panel es para los responsables de club. Tu carné está en la app." with a "Salir" button; the member card's access section becomes "Hacer responsable del club" (creates the account and makes the member manager at once, no checkbox).
- Tests: vitest (plain member refused, manager and super admin enter; grant form without checkbox sends club_admin true).

- [x] Write the failing tests.
- [x] Gate the panel and change the grant form.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: the manager sees who cannot see their card

Public contracts:

- HTTP: member list items gain `has_own_email: bool` (email present and not shared with another member).
- Admin copy: badge "Sin correo propio: no puede ver su carné" in Miembros.
- Tests: backend (no email, shared email, own email); vitest badge.

- [x] Write the failing tests.
- [x] Compute the flag in the member list and show the badge.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

All phases are implemented: review, QA and merge.

A card in every pocket, the keys to the dojo for its managers, and nobody left behind: 📱 🔑 ✉️ 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
