---
name: "member_card_on_the_web"
description: "A member who manages nothing sees their card in the web panel, installable on an iPhone home screen"
created_at: "2026-11-02T09:30:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "high"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "high"

last_implementation_at: "2026-11-02T09:28:31Z"
has_completed_all_phases: "true"
---

# Member card on the web

## Goal

The card app is only on Android, so a member with an iPhone cannot see their card. A signed-in member who manages nothing lands on a card page in the web panel instead of `/unauthorized`, can activate the card from the web and can add it to the home screen. The App Store release follows separately.

## Context

- [`frontend/src/components/AppLayout.tsx`](../../../frontend/src/components/AppLayout.tsx): line 29 sends `userRole === null` to `/unauthorized`, unconditionally. No switch hides this behaviour.
- [`frontend/src/App.tsx`](../../../frontend/src/App.tsx): route declarations.
- [`frontend/src/pages/unauthorized.page.tsx`](../../../frontend/src/pages/unauthorized.page.tsx): also reached by a club admin refused by `ProtectedRoute`.
- [`frontend/src/features/auth/components/LoginForm.tsx`](../../../frontend/src/features/auth/components/LoginForm.tsx), [`InstallAppButton.tsx`](../../../frontend/src/features/auth/components/InstallAppButton.tsx), [`AuthLayout.tsx`](../../../frontend/src/features/auth/components/AuthLayout.tsx).
- [`frontend/src/features/licenses/utils/licenseStatus.ts`](../../../frontend/src/features/licenses/utils/licenseStatus.ts): `getStatusPresentation` derives the label from the dates. The card reuses it.
- [`frontend/public/manifest.webmanifest`](../../../frontend/public/manifest.webmanifest) and [`frontend/index.html`](../../../frontend/index.html): `start_url: "/"` stays and role routing takes the member to the card. `body` is `overflow-hidden`, so the page needs its own scroll container.
- [`backend/src/infrastructure/web/routers/licenses.py`](../../../backend/src/infrastructure/web/routers/licenses.py): `GET /licenses/member/{id}` and `GET /licenses/{id}/image` already accept a member's token for their own data. `/member/{id}` does not populate `member_name` and `member_status` (`_populate_member_names`).
- [`backend/src/infrastructure/adapters/services/email_service.py`](../../../backend/src/infrastructure/adapters/services/email_service.py): `send_card_activation_email`. The link already points to the web `/reset-password`.
- [`mobile/app/(app)/index.tsx`](../../../mobile/app/(app)/index.tsx) and [`mobile/app/activate.tsx`](../../../mobile/app/activate.tsx): the behaviour to match. Mobile reads the status the API derives from the dates and has no "De baja"; the web adds it, and offers the image only while the licence is in force because the image always prints the current licence year.
- Docs: [`the-card-is-for-every-member-the-panel-for-managers.md`](../../../docs/domain/the-card-is-for-every-member-the-panel-for-managers.md), [`a-refused-role-lands-on-unauthorized.md`](../../../docs/conventions/a-refused-role-lands-on-unauthorized.md), [`validity-follows-dates.md`](../../../docs/domain/validity-follows-dates.md), [`a-deregistered-members-licence-is-history.md`](../../../docs/domain/a-deregistered-members-licence-is-history.md), [`pwa-updates-without-service-worker.md`](../../../docs/conventions/pwa-updates-without-service-worker.md), [`auth-endpoints.md`](../../../docs/security/auth-endpoints.md), [`frontend-features.md`](../../../docs/architecture/frontend-features.md), [`ui-visual-language.md`](../../../docs/conventions/ui-visual-language.md), [`no-production-data.md`](../../../docs/testing/no-production-data.md).

### Real variety matrix (production, 148 accounts without super admin, 2026-11-02)

Each row is a test case and a QA row.

| Accounts | Case | Card shows |
| --- | --- | --- |
| 59 | Member active or without status, licence in date | "Activa" |
| 22 | Member active or without status, licence past its date, stored `active` | "Caducada" |
| 16 | Member deregistered, licence in date or past | "De baja" |
| 20 (within the above) | Member document without `status` | Treated as active |
| 46 | Club admin, one licence | Same card as a member |
| 3 | Club admin, two licences (grade and title) | The licence holding the grade |
| 1 | No licence | "Sin licencia vigente" |
| 1 | Licence stored `expired`, past its date | "Caducada" |
| 0 today | Expires within 30 days (everyone from December 1) | "Caduca pronto" |
| 0 today | Licence revoked | "Anulada" |
| 0 today | Account without member | "Sin miembro asociado" |

### Known limits, not in this plan

- The iPhone home screen icon does not share its session with Safari: the member signs in again after installing it. The install hint says so.
- A session lasts `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30). Lengthening it also affects managers.
- The card needs a connection: the panel has no service worker, by convention.
- QA runs in a browser at phone size. A real iPhone must be checked before telling the clubs.

## Phases

### Phase 1: a member sees their card

A signed-in member who manages nothing lands on `/card` and sees their licence image, state and details.

Public contracts:

- HTTP: `GET /api/v1/licenses/member/{member_id}` response items now carry `member_name` and `member_status`.
- Route: `/card`, outside the panel shell, for any signed-in user.
- Tests:
  - `backend/tests/api`: the member route returns `member_name` and `member_status`; a member still gets 403 on another member's licences.
  - `MemberCard`: one case per row of the matrix.
  - `pickCardLicence`: latest expiry wins; the grade licence wins over a title-only one; a revoked licence loses to one in force.
  - `AppLayout`: a user without role goes to `/card`.
- Copy: "Tu carné", "Caduca el", "Caducó el", "Nombre", "Grado", "N.º de licencia", "Cerrar sesión", "Sin licencia vigente", "Pregunta a tu club.", "Sin miembro asociado", "No se pudo cargar la imagen", "Reintentar".

To-do:

- [x] Populate `member_name` and `member_status` in `GET /licenses/member/{member_id}`, with its test.
- [x] Add `pickCardLicence` to the licences feature, with its tests.
- [x] Add the licence image service and query hook, loading the PNG as a blob.
- [x] Add `MemberCard` and `card.page.tsx`, with its own scroll container, mobile first.
- [x] Route `/card` in `App.tsx` and redirect `userRole === null` to it in `AppLayout`.
- [x] Update the `/unauthorized` copy for the club admin it still receives.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: activate and install without the app

A member with an iPhone goes from nothing to a card on their home screen using only the web.

Public contracts:

- Route: `/activate`, public, calling the existing `POST /api/v1/auth/card-access/request`. It shows the server's single answer whatever happened.
- Manifest and `index.html`: the icon is named "Spain Aikikai".
- Email: `send_card_activation_email` says the card is in the app or on the web.
- Tests: `ActivateCardForm` sends the email and shows the same answer on success; `LoginForm` links to `/activate`; `InstallAppButton` shows the new iOS hint; the activation email text.
- Copy: "Activa tu carné", "Pon el correo de tu ficha del club y te enviamos un enlace para crear tu contraseña.", "Enviar enlace", "¿Primera vez? Activa tu carné", and the iOS hint "En Safari, pulsa el botón Compartir y luego \"Añadir a pantalla de inicio\". Después vuelve a entrar con tu correo y contraseña."

To-do:

- [x] Add the card access service, mutation and `ActivateCardForm`, and the `/activate` page.
- [x] Link it from `LoginForm`.
- [x] Show `InstallAppButton` on `/card` and update the iOS hint.
- [x] Rename the icon in the manifest and `index.html`.
- [x] Update the activation email text, with its test.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: download, and the card for managers

A member saves their card, and a manager reaches their own card from the panel.

Public contracts:

- UI: a "Descargar" action on the card, sharing the image where the browser can and downloading it otherwise; a "Mi carné" entry in the panel menu for managers linked to a member.
- Tests: the action shares when `navigator.canShare` accepts files and downloads otherwise; the menu shows "Mi carné" to a club admin.
- Docs: `a-refused-role-lands-on-unauthorized.md` and `the-card-is-for-every-member-the-panel-for-managers.md` describe the new landing.
- Copy: "Descargar", "Mi carné", "Volver al panel".

To-do:

- [x] Add the "Descargar" action, with its tests.
- [x] Add "Mi carné" to the manager menu, and "Volver al panel" on the card for managers.
- [x] Update both docs.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases are done. The App Store release follows in its own branch.

Every phase landed, saved to the home screen with [Codely](https://codely.com) and Turbotuga™. 🏁 < 📲 < 🪪 < 🐢 💨
