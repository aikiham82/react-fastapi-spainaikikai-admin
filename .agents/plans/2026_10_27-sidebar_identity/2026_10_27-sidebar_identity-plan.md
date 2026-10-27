---
name: "Sidebar identity"
description: "Show the signed-in person and their club (initials first, then an uploaded club logo) in the admin rail, the mobile drawer and the home greeting."
created_at: "2026-10-27T12:00:00Z"

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
has_completed_all_phases: "false"
---

# Sidebar identity

## 🎯 Goal

A club manager who opens the panel cannot tell which account or which club they are in. Show the club (initials, later its logo) at the top of the rail and the person (initials avatar and name) at the bottom, with an account card that holds the sign-out action.

## 👀 Context

- Design: Claude Design project "Spain Aikikai admin - rediseño", file `Identidad en la barra.dc.html` (frames A: rail closed, B: account card open, C: mobile drawer).
- Backend:
  - [`backend/src/infrastructure/web/routers/users.py`](../../../backend/src/infrastructure/web/routers/users.py) `read_users_me`: enriches from `AuthContext.member`.
  - [`backend/src/infrastructure/web/dto/user_dto.py`](../../../backend/src/infrastructure/web/dto/user_dto.py) `UserMeResponse`.
  - [`backend/src/domain/entities/member.py`](../../../backend/src/domain/entities/member.py) `is_club_account_placeholder`: last name `(Club Admin)` is not a real name.
  - [`backend/src/infrastructure/web/routers/seminars.py`](../../../backend/src/infrastructure/web/routers/seminars.py) cover image upload: the model for the club logo upload.
  - [`backend/src/infrastructure/web/authorization.py`](../../../backend/src/infrastructure/web/authorization.py) `check_club_access_ctx`.
- Frontend:
  - [`frontend/src/components/Rail.tsx`](../../../frontend/src/components/Rail.tsx), [`Sidebar.tsx`](../../../frontend/src/components/Sidebar.tsx), [`AppLayout.tsx`](../../../frontend/src/components/AppLayout.tsx).
  - [`frontend/src/components/ui/graphic.tsx`](../../../frontend/src/components/ui/graphic.tsx) `Avatar`, `initialsOf`.
  - [`frontend/src/features/auth/data/auth.schema.ts`](../../../frontend/src/features/auth/data/auth.schema.ts) `CurrentUser`; [`useAuthContext.tsx`](../../../frontend/src/features/auth/hooks/useAuthContext.tsx).
  - [`frontend/src/components/__tests__/navigation-shell.test.tsx`](../../../frontend/src/components/__tests__/navigation-shell.test.tsx).
- Docs: `docs/conventions/navigation-groups-and-tabs.md`, `docs/conventions/ui-visual-language.md`, `docs/domain/roles-and-permissions.md`, `docs/domain/club-account-placeholders-are-legacy.md`, `docs/architecture/backend-hexagonal.md`.

### Real-data matrix (production, read-only, 2026-10-27)

| Account kind | Count | `display_name` | Club block |
|---|---|---|---|
| `super_admin`, no member | 1 | username | federation logo + "Spain Aikikai", role "Super admin" |
| `user` + member `club_role=admin`, real name | 49 | first + last name | club initials + name |
| `user` + member `club_role=admin`, last name `(Club Admin)` | 5 | username | club initials + name |
| `user` + member `club_role=member` | 95 | first + last name | club initials + name |

Clubs: 43; name length avg 17, max 40 chars (6 words), 13 above 20 chars. The rail clamps the name to two lines and keeps the full name in `title`.

## 🪜 Phases

### Phase 1: who you are and which club (initials)

Backend `/users/me` gains `display_name` and `club_name`; the rail shows the club tile on top and an account button at the bottom that opens a card with name, email, club, role and "Cerrar sesión"; the mobile drawer shows the club and the person; the home greeting uses the first name.

- [x] `UserMeResponse` adds `display_name: str` and `club_name: Optional[str]`.
- [x] `read_users_me` fills `display_name` from the member's full name unless the member is a club account placeholder or absent (then `username`), and `club_name` from the member's club.
- [x] Tests in `test_user_router`: `/users/me` for super admin without member, club admin with real name, placeholder club account, plain member.
- [x] `CurrentUser` adds `display_name` and `club_name`; `useAuthContext.currentUser` returns the fresh query result and `useIdentity` derives name, email, club and role label (existing `roleLabels` copy).
- [x] `ClubMark` component (club initials tile; federation logo when there is no club).
- [x] `AccountMenu` component (avatar button + popover card with name, email, club, role label, "Cerrar sesión").
- [x] `Rail`: `ClubMark` + clamped club name at the top; `AccountMenu` replaces the standalone "Salir" button.
- [x] `Sidebar` (mobile drawer): club and role at the top; avatar, name and email at the bottom.
- [x] Home greeting: "Hola, {first name}".
- [x] Tests in `navigation-shell.test.tsx`: club tile and name, account card opens and signs out, super admin shows federation and its role, 40-char club name keeps the full name in `title`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: club logo

A club admin (or the super admin) uploads the club logo; when present it replaces the initials everywhere `ClubMark` is used.

- [ ] `Club` entity, Mongo adapter, `ClubResponse` and `UserMeResponse` add optional `logo_url`.
- [ ] `UploadClubLogoUseCase.execute(club_id, image_bytes) -> Club`: validates magic bytes, square-crops and resizes to 256x256 JPEG, stores `uploads/clubs/{club_id}.jpg`, sets `logo_url`.
- [ ] `POST /api/v1/clubs/{club_id}/logo` (multipart): `check_club_access_ctx` plus club admin or super admin.
- [ ] Tests: upload succeeds, non-image rejected with 400, other club's admin gets 403, plain member gets 403.
- [ ] Frontend: `clubService.uploadLogo`, `useUploadClubLogoMutation`, logo picker in the club form; `ClubMark` renders the image when `logo_url` exists.
- [ ] Tests: `ClubMark` renders the logo when present and initials otherwise; upload mutation invalidates `currentUser` and `club`.
- [ ] Copy: "Logo del club", "Cambiar logo", "Sube una imagen JPG o PNG".
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 2: club logo.

Name tag stitched on, the turtle knows who it is: 🪪 < 🐢 💨 (Turbotuga™, [Codely](https://codely.com)’s mascot)
