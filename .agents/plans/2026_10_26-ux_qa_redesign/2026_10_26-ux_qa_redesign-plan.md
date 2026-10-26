---
name: "2026_10_26-ux_qa_redesign"
description: "Make every admin screen intuitive, minimal, professional and responsive, remove AI-slop styling and fix the frontend bugs found by the UX QA team."
created_at: "2026-10-26T12:00:00Z"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
last_implementation_at: "2026-10-26T17:00:00Z"
has_completed_all_phases: false

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# UX QA redesign of the admin frontend

## 🎯 Goal

Make every screen of the admin frontend understandable for a non-technical club director, visually modern and professional (no AI-slop look), and correct on phone, tablet and desktop. Fix the frontend bugs the UX QA team found on the way.

## 👀 Context

### Source of the work

Four UX QA agents browsed every screen as super admin and as club admin at 1440x900 and 390x844. Their findings (ids `SH-*`, `CM-*`, `PY-*`, `LI-*`) and screenshots live in the session scratchpad. Each phase below lists the ids it closes.

Out of scope:

- `PY-19`, club admins can list invoices of other clubs. This is a backend authorization bug and goes to its own branch.
- The local 404 on `/api/v1/price-configurations/seminar-price`. Production has the `oficialidad_seminar` price, so the missing piece is only the frontend error state (`LI-2`).

### Decisions agreed with the user

- **Payments menu:** "Nuevo Pago" and "Resumen de Pagos" become one entry, "Pagos", at `/payments`, with tabs "Pendientes" (pay) and "Historial". `/annual-payments` and `/club-payments` redirect to it.
- **Payment wizard:** the wizard becomes a member checklist. The quantities are derived from the checked members, and the `InitiateAnnualPaymentRequest` payload is unchanged.
- **Public registration:** the login no longer links to `/register`. Instead it shows "¿Primera vez? Pide acceso a tu club o a la Federación". `/register` stays but is translated and restyled.
- **Visual direction (from `frontend/public/logo.jpg`):**
  - Base: paper white, ink near-black, and the brush red of the logo frame as the only accent, reserved for the primary action.
  - Status colours: green = al día, amber = caduca pronto, red = caducada/impagada.
  - Type and shape: one modern sans (Geist), a light sidebar, one radius scale, hairlines instead of shadows.
- **Responsive is an acceptance criterion of every phase:**
  - Widths: 360, 390, 768, 1024 and 1440 px.
  - At every width: no horizontal scroll and tap targets of at least 44px.
  - Tables: at 1024 px they fit without clipping columns; below 768 px they become cards.
  - Dialogs keep their primary button visible (sticky footer) and scroll inside `90dvh`.

### Design rules

These come from the `design-taste-frontend` and `emil-design-eng` skills.

- **What to avoid:**
  - Gradients, gradient text, glassmorphism, blurred blobs, emoji and hover lifts.
  - Icon-in-coloured-circle headers, cards inside cards, stat tiles, filler copy and em-dashes.
- **Motion:**
  - Buttons press with `scale(0.97)` at 160ms ease-out.
  - Dialogs and popovers enter in under 250ms with `cubic-bezier(0.23, 1, 0.32, 1)`.
  - Nothing animates on frequent actions.
  - All motion respects `prefers-reduced-motion`.
- **Text:** all visible text is Spanish, has correct accents, uses no developer keys, and uses es-ES dates (`01/03/2025`) and money (`1.234,56 €`).

### Real data varieties (payment wizard)

The wizard has to handle the grade and payment combinations that exist in the data. Each combination is a test case in phase 7 and a QA row.

| Member grade | Licence item | Insurance items |
|---|---|---|
| Adult kyu | `kyu` | accidentes, RC |
| Kyu infantil (≤14) | `kyu_infantil` | accidentes, RC |
| Dan | `dan` | accidentes, RC |
| Fukushidoin | `fukushidoin` (includes RC + DAN) | accidentes only |
| Shidoin | `shidoin` (includes RC + DAN) | accidentes only |
| Member already paid this season | nothing pre-ticked | nothing pre-ticked |

The wizard also covers these cases:

- Club fee already paid.
- Club fee unpaid.
- No price configuration for the year (club admin message vs super admin link).

The other screens do not depend on per-club data shapes.

### Files and folders

- Shell and global styles:
  - [`frontend/src/index.css`](../../../frontend/src/index.css)
  - [`frontend/src/components/AppLayout.tsx`](../../../frontend/src/components/AppLayout.tsx)
  - [`frontend/src/components/Header.tsx`](../../../frontend/src/components/Header.tsx)
  - [`frontend/src/components/Sidebar.tsx`](../../../frontend/src/components/Sidebar.tsx)
  - [`frontend/src/components/ui/`](../../../frontend/src/components/ui)
- Routes: [`frontend/src/App.tsx`](../../../frontend/src/App.tsx)
- Pages: [`frontend/src/pages/`](../../../frontend/src/pages)
- Features:
  - [`frontend/src/features/dashboard`](../../../frontend/src/features/dashboard)
  - [`members`](../../../frontend/src/features/members)
  - [`clubs`](../../../frontend/src/features/clubs)
  - [`licenses`](../../../frontend/src/features/licenses)
  - [`insurance`](../../../frontend/src/features/insurance)
  - [`invoices`](../../../frontend/src/features/invoices)
  - [`seminars`](../../../frontend/src/features/seminars)
  - [`annual-payments`](../../../frontend/src/features/annual-payments)
  - [`club-payments`](../../../frontend/src/features/club-payments)
  - [`member-payments`](../../../frontend/src/features/member-payments)
  - [`price-configurations`](../../../frontend/src/features/price-configurations)
  - [`import-export`](../../../frontend/src/features/import-export)
  - [`auth`](../../../frontend/src/features/auth)
  - [`password-reset`](../../../frontend/src/features/password-reset)
- Docs to follow:
  - [`docs/architecture/frontend-features.md`](../../../docs/architecture/frontend-features.md)
  - [`docs/conventions/frontend.md`](../../../docs/conventions/frontend.md)
  - [`docs/conventions/select-all-option.md`](../../../docs/conventions/select-all-option.md)
  - [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md)
  - [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md)
  - [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md)
  - [`docs/testing/no-production-data.md`](../../../docs/testing/no-production-data.md)

## 🪜 Phases

### Phase 0: Claude Design mockups

Produce the reference mockups that every later phase is compared against.

- [x] Create a Claude Design project "Spain Aikikai admin" with the visual direction above and the logo.
- [x] Mock the following at 390, 768 and 1440 px:
  - Login.
  - Dashboard.
  - Sidebar (light, grouped).
  - Members list.
  - Payments "Pendientes" (member checklist plus the sticky total).
  - One form dialog.
- [x] Record the mockup links in this plan: [Rediseño.dc.html](https://claude.ai/design/p/11725e09-0da3-4f43-a9ff-13539555008d?file=Redise%C3%B1o.dc.html) (options 1a login, 1c-1e dashboard, 1f-1g members, 1h-1i payments).
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 1: Visual foundation and app shell

A new look on every screen at once: tokens, type, sidebar, header and formatting. Closes `SH-2`, `SH-4`, `SH-5`, `SH-6`, `SH-17`, `SH-18`, `CM-6`, `LI-10`, `LI-11`, `LI-20`, `PY-7`, `PY-8`.

- [x] `index.css` tokens:
  - Paper, ink and brush-red palette.
  - Status tokens (`--success`, `--warning`, `--danger`).
  - Geist font, self-hosted.
  - One radius scale.
  - Motion easing variables.
  - Reduced-motion block.
- [x] `Button`: press feedback, no hover lift, 44px minimum on touch.
- [x] `src/core/utils/format.ts`:
  - `formatDate(date)`: `dd/mm/yyyy`.
  - `formatDateTime(date)`.
  - `formatCurrency(amount)`: `1.234,56 €`.
  - Replace every `toFixed(2)€` and every bare `toLocaleDateString()`.
- [x] `StatusBadge` component: green, amber or red, always with a word, never colour alone.
- [x] `Sidebar`:
  - A light surface with groups "Mi club", "Actividad" and "Administración".
  - Super-admin-only items stay gated by `usePermissions().canAccess()`.
  - Email and role shown at the top.
  - 44px rows.
  - The brand line is not an `h1`.
- [x] `Header`:
  - Remove the bell.
  - `aria-label="Abrir menú"`.
  - Title derived from the matching nav item.
  - 44px buttons.
- [x] Global accent pass over every visible string (`contrasena`, `Configuracion`, `sesion`, `Seras`, `Asignacion`, `Descripcion`...).
- [x] Tests:
  - `formatDate`, `formatCurrency`: `formats es-ES dates as dd/mm/yyyy`, `formats euros with thousands separator and trailing symbol`, `returns a dash for null values`.
  - `StatusBadge`: `renders the label next to the colour for each status`.
  - `Sidebar`: `groups items into Mi club, Actividad and Administración`, `hides Administración for club admins`.
  - `Header`: `shows the title of the current route`, `labels the menu button`.
- [x] Responsive check of the shell at 360, 390, 768, 1024 and 1440 px. The mobile menu must open, and the layout must have no horizontal scroll.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: Entry screens

Login, password recovery, registration, unauthorized and payment result pages share one calm layout. Closes `SH-1`, `SH-9`, `SH-10`, `SH-11`, `SH-12`, `SH-13`, `SH-14`, `SH-15`, `SH-16`, `SH-19`.

- [x] One `AuthLayout`:
  - The logo, large, on paper.
  - A left-aligned form.
  - No gradient, blur, feature list or filler copy.
  - Single column on mobile and tablet portrait.
- [x] Login:
  - Inline `role="alert"` error that stays until the next submit.
  - Underlined 44px links.
  - "¿Primera vez? Pide acceso a tu club o a la Federación" instead of "Regístrate".
- [x] `/register`: Spanish copy, same layout, password rule aligned with reset (8 characters).
- [x] Forgot and reset password:
  - The invalid-token state hides the "nueva contraseña" heading.
  - `aria-label` on the eye buttons.
  - "Mínimo 8 caracteres" always visible.
  - `Button asChild` instead of `Link > Button`.
- [x] Payment success and failure:
  - No countdown or auto-redirect.
  - One plain sentence per outcome.
  - The Redsys code in small print.
- [x] `/unauthorized`: plain message with "Volver al inicio" and "Cerrar sesión".
- [x] Spanish copy:
  - "Entra para gestionar tu club."
  - "Pago recibido. Te hemos enviado la factura por correo."
  - "No tienes permiso para ver esta página."
- [x] Tests:
  - `LoginForm`: `shows the error inline after a wrong password`, `does not link to registration`.
  - `RegisterForm`: `renders Spanish labels`.
  - `ResetPasswordForm`: `hides the new password heading when the token is invalid`.
  - `PaymentFailurePage`: `does not redirect automatically`.
- [x] Responsive check at all five widths.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: Dashboard "what needs your attention"

The home screen tells the user what to do next. Closes `SH-3`, `SH-7`, `SH-8`.

- [x] `home.page.tsx` returns only `<Dashboard />`: no gradient wrapper and no second `ProtectedRoute`.
- [x] `Dashboard`:
  - Greeting with the club name.
  - "Lo que necesita tu atención" rows (caducadas, caducan pronto, pago pendiente, próximo seminario), each linking to the filtered list.
  - Two large actions, "Añadir miembro" and "Pagar".
  - Remove the stat tiles, the empty activity card and the fake seminar times.
  - Club tiles only for super admin.
- [x] Empty state: "Todo al día." when nothing needs attention.
- [x] Tests:
  - `Dashboard`: `lists expired licences as an attention row linking to the filtered list`, `shows Todo al día when nothing is pending`, `hides club totals for club admins`.
- [x] Responsive check at all five widths.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 4: One list pattern for members, licences, insurance, invoices and clubs

Every list behaves the same way.

- **Toolbar:** search, one "Filtros" button and the primary action.
- **Order:** urgent items come first.
- **Mobile:** tappable cards.
- **Dialogs:** a visible save button.

Closes `CM-7` to `CM-31` (except the Settings ones), `LI-4`, `LI-5`, `LI-7`, `LI-8`, `LI-9`, `LI-12`, `LI-14`, `LI-17`, `LI-21`, `LI-22`, `PY-20`, `PY-21`.

- [ ] Shared pieces in `components/ui`:
  - `ListToolbar` (search plus filters popover with an active-count badge).
  - `EmptyState` with "Quitar filtros".
  - `ResponsiveDialog` (`max-h-[90dvh]`, sticky footer).
  - A row-actions menu.
- [ ] Members:
  - One "Seguros" column, the payments action in the row menu, `whitespace-nowrap` club, fits at 1024 and 1440.
  - Labelled filters.
  - On mobile, tappable cards and insurance badges labelled "RC" and "Accidentes".
  - `setFilters(prev => ...)` (stale-closure fix).
  - Create form: no pre-selected club for super admin, hidden club for club admin, "Más datos" collapsed, access block as a secondary section, no auto-selected text.
- [ ] Licences:
  - Expired and expiring first, with a "Caducan pronto" chip.
  - Read `?estado=caducadas` and `?estado=caducan-pronto` from the URL (the dashboard links there).
  - Explicit "Editar" action.
  - Club admin sees the hint "Las licencias se crean al registrar el pago".
- [ ] Insurance:
  - Labelled filters.
  - Only member, type and dates required.
  - Actions consistent with the club admin's permissions.
- [ ] Invoices:
  - "Descargar PDF" in the detail footer.
  - Empty fields hidden.
  - Text buttons on mobile.
- [ ] Clubs:
  - Dialog scrolls on mobile.
  - Only name and city required.
  - Country prefilled.
  - Address shown once, plus member count.
  - Delete moved into the edit dialog, with the member count in the confirmation.
- [ ] Tests:
  - `MemberList`: `fits filters behind one Filtros button`, `clears search and filters with Quitar filtros`, `labels RC and accident insurance on mobile cards`.
  - `MemberForm`: `does not preselect a club for super admins`, `hides the club field for club admins`.
  - `LicenseList`: `orders expired and expiring licences first`.
  - `ClubForm`: `requires only name and city`.
  - `ResponsiveDialog`: `keeps the footer visible`.
- [ ] Responsive check of each list and dialog at all five widths, both roles.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 5: Settings and "Mi club"

Only controls that work. Closes `CM-1` to `CM-5`, `CM-24`.

- [ ] Settings becomes one column:
  - "Mi cuenta": email plus "Cambiar correo".
  - "Contraseña": "Enviarme un enlace", using the existing reset flow.
  - Remove the fake switches and the fake "Última sesión".
- [ ] For a club admin, `/clubs` shows "Mi club" with "Editar datos", with no search and no list.
- [ ] Tests:
  - `SettingsPage`: `sends a password link from Cambiar contraseña`, `does not render notification or theme switches`.
  - `ClubsPage`: `shows Mi club for club admins`.
- [ ] Responsive check at all five widths.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 6: Seminars

Upcoming first, actions that fit, and an oficialidad flow that can fail gracefully. Closes `LI-1`, `LI-2`, `LI-3`, `LI-13`, `LI-15`, `LI-16`.

- [ ] List:
  - "Próximos" first, "Pasados" collapsed.
  - Compact rows without the fake image.
  - Edit and delete in a row menu.
  - Nothing clipped at any width.
- [ ] Oficialidad:
  - Not offered for `completed` or `cancelled`.
  - Price load failure shows "No se pudo cargar el precio" and "Reintentar".
- [ ] Form:
  - Venue and city are the only required location fields.
  - Sticky footer.
  - Scroll to the first error.
- [ ] Detail shows the registered count.
- [ ] Tests:
  - `SeminarList`: `lists upcoming seminars before past ones`, `does not offer oficialidad for finished seminars`.
  - `OficialidadDialog`: `shows a retry action when the price fails to load`.
- [ ] Responsive check at all five widths.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 7: One "Pagos" page with a member-checklist wizard

Paying is choosing members, seeing the total and pressing one button. Closes `PY-1` to `PY-6`, `PY-9` to `PY-18`, `PY-22` to `PY-27`.

- [ ] Route `/payments` with tabs "Pendientes" and "Historial".
  - `/annual-payments` and `/club-payments` redirect to it.
  - The sidebar has a single "Pagos" entry.
  - The Redsys return pages link to `/payments`.
- [ ] "Pendientes" (member checklist):
  - One row per member, with "Licencia" and "Seguro" in plain words, pre-ticked with what is missing (existing prefill).
  - The quantities in `InitiateAnnualPaymentRequest` are derived from the ticked members; `member_assignments` is unchanged.
  - Club fee row.
  - A sticky total bar, "N miembros · 1.234,56 €  Pagar con tarjeta" (bottom on mobile and tablet, right column on desktop).
  - Before leaving, one sentence: "Pagará con tarjeta en la web del banco. Al terminar recibirá la factura por correo y las licencias se activarán."
  - Year hidden behind "Otro año".
  - Fukushidoin and Shidoin show "Incluye el seguro RC".
- [ ] Missing prices:
  - The club admin sees "El pago no está disponible todavía. Avise a la Federación."
  - The super admin sees which concept is missing and a link to Precios.
- [ ] "Historial":
  - One line, "3 de 5 miembros al día".
  - One row per member with one status word.
  - Neutral grey for pending, red only for overdue.
  - No year banner or stat tiles.
  - The super admin keeps the clubs table on top.
- [ ] Manual payment dialog:
  - Running total.
  - No nested scroll.
  - Correct plural.
- [ ] Prices:
  - A concept dropdown instead of the free-text key.
  - Existing keys disabled.
  - Spanish labels.
  - Visible "Editar".
  - Neutral "Activo".
- [ ] Tests:
  - `PaymentChecklist`, one per grade row of the varieties table:
    - `derives kyu, kyu infantil, dan, fukushidoin and shidoin counts from ticked members`
    - `does not offer RC for fukushidoin or shidoin`
    - `does not pretick members already paid`
    - `includes the club fee only when unpaid`
  - `PaymentTotalBar`: `shows the running total in euros`.
  - `PaymentsPage`: `redirects /annual-payments and /club-payments to /payments`, `shows the friendly missing-price message to club admins`.
  - `PriceConfigurationForm`: `offers a fixed list of concepts`.
- [ ] Responsive check at all five widths, both roles.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 8: Import and export

Two plain actions. Closes `LI-18`, `LI-19`.

- [ ] One column with "Descargar Excel" first and "Subir Excel" second.
- [ ] A data-type selector inside each section instead of tabs; the tab bar is hidden when only one type is available.
- [ ] Columns behind "Opciones".
- [ ] Template download link.
- [ ] Tests:
  - `ImportExportPage`: `hides the type selector when only members are available`, `shows the template link`.
- [ ] Responsive check at all five widths.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Continue with Phase 4: one list pattern for members, licences, insurance, invoices and clubs.

Ink and paper, a calm door, and a home that says what to do next. 🖌️ 🚪 🧭 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
