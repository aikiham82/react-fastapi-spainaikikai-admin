---
name: "2026_10_27-one_step_actions"
description: "Bring the approved Claude Design one-step actions to the app: price active toggle in the row, club responsible in Datos del club, and Renovar from licence and insurance rows."
created_at: "2026-10-27T17:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"
---

# One-step actions from the approved mockups

## 🎯 Goal

Every use case in the fewest steps ([`ui-visual-language.md`](../../../docs/conventions/ui-visual-language.md)): a price is switched on or off from its row, Datos del club names its responsible person, and an expired or expiring licence or insurance is renewed from its row in one tap that lands on Pendientes with only that member ticked.

## 👀 Context

- Mockups: Claude Design project "Spain Aikikai admin - rediseño", file `Secciones.dc.html` (3a-3t), approved 2026-10-27.
- Prices: [`PriceConfigurationList.tsx`](../../../frontend/src/features/price-configurations/components/PriceConfigurationList.tsx); `PUT /api/v1/price-configurations/{id}` already takes a partial body (`{"is_active": false}`), super admin only.
- Responsible: no club field; derived from members with `club_role == "admin"` ([`roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md)). [`MyClub.tsx`](../../../frontend/src/features/clubs/components/MyClub.tsx).
- Renovar: [`LicenseList.tsx`](../../../frontend/src/features/licenses/components/LicenseList.tsx), [`InsuranceList.tsx`](../../../frontend/src/features/insurance/components/InsuranceList.tsx) (rows carry `member_id`, not the club); Pendientes in [`useAnnualPaymentContext.tsx`](../../../frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx) (no preselection today; prefill applied once per `club_id:payment_year`). Rules: [`payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`payments-never-guess-paid-state.md`](../../../docs/domain/payments-never-guess-paid-state.md).
- Out of scope (user decision): "Pagar" on an invoice (invoices are only issued after a completed payment) and an "Acceso a la app" card in Ajustes.
- Who: Renovar for whoever can pay (club admin for own club, super admin any club). Variety matrix: licence expired / expiring; insurance accident / RC; member with part of the season already paid; super admin (club chosen from the member) / club admin.

## 🪜 Phases

### Phase 1: Price switch in the row

- [x] `PriceConfigurationList` row: a switch labelled "Activo"/"Inactivo" (word always visible) that saves `{ is_active }` at once, super admin only; read-only roles see the word.
- [x] Tests: toggling calls update with `{ is_active: false }`; the word follows the state; no switch without update permission.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: Responsible in Datos del club

- [x] `MyClub`: row "Responsable" with the names of the club's members whose `club_role` is admin (user-check icon tile); hidden when none.
- [x] Tests: shows one or two responsible names; hidden when no admin member.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: Renovar from the row

- [ ] Contract: `/payments?renovar=<member_id>` opens Pendientes with that member's pending items ticked and nobody else; a super admin gets the member's club chosen. Unknown member or failed prefill keeps the existing error/blocked state, never guesses.
- [ ] `LicenseList` and `InsuranceList`: "Renovar" button on expired and expiring rows for users who can create payments.
- [ ] Tests: button only on expired/expiring rows and only with payment permission; link carries the member; Pendientes ticks only that member (club admin and super admin); other members stay unticked; paid items of that member are not ticked.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 3: Renovar from the row.

Switch flipped, responsible named: 🐢 💨 💡 🥋 (Turbotuga™, [Codely](https://codely.com)'s mascot).
