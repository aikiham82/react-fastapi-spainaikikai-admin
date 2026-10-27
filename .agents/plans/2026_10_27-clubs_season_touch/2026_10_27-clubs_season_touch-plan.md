---
name: "2026_10_27-clubs_season_touch"
description: "Clubs list shows members and season payment, every Pagos screen and Inicio speak of one season, and touch targets reach 44px on touch screens."
created_at: "2026-10-27T12:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"
---

# Clubs, one season and touch targets

## 🎯 Goal

Follow-ups from the graphic-first UI QA: the super admin Clubs list shows each club's members and whether it paid the season, with "Dar de baja" moved to the row menu; Pendientes, Historial and Inicio all name the same season; the controls still under 44px on touch screens grow. Tapping a member keeps opening the edit form (user confirmed).

## 👀 Context

- Clubs list: [`ClubList.tsx`](../../../frontend/src/features/clubs/components/ClubList.tsx), [`DeregisterClubButton.tsx`](../../../frontend/src/features/clubs/components/DeregisterClubButton.tsx), `RowActions` in [`list-controls.tsx`](../../../frontend/src/components/ui/list-controls.tsx). `GET /clubs` returns no counts.
- Per-club data already exists: `GET /api/v1/member-payments/all-clubs/summary?payment_year=` (super admin), hook `useAllClubsPaymentSummaryQuery` in [`useClubPaymentsQueries.ts`](../../../frontend/src/features/club-payments/hooks/queries/useClubPaymentsQueries.ts); fields `total_members`, `members_with_license`, `has_club_fee`, derived from completed `MemberPayment` (the rule in [`payment-cycles.md`](../../../docs/domain/payment-cycles.md)). Deregistered clubs are not in it.
- Season helpers: [`defaultPaymentYear.ts`](../../../frontend/src/core/utils/defaultPaymentYear.ts) (`insuranceSeasonYear`, `seasonLabel`). Pendientes header in [`PaymentSetup.tsx`](../../../frontend/src/features/annual-payments/components/PaymentSetup.tsx); Historial header and amber box in [`ClubPaymentsPage.tsx`](../../../frontend/src/features/club-payments/components/ClubPaymentsPage.tsx), default year in `useClubPaymentsContext.tsx`; Inicio counts `transactions` of `now.year` in [`dashboard.py`](../../../backend/src/infrastructure/web/routers/dashboard.py).
- Touch: `button.tsx` sizes already add `pointer-coarse:min-h-11`; gaps are RowActions menu items (`min-h-10`), inline `TextButton` ([`text-link.tsx`](../../../frontend/src/components/ui/text-link.tsx)) and the seminar cover remove X (`CoverImageDropZone.tsx`, 32px).
- Docs: [`ui-visual-language.md`](../../../docs/conventions/ui-visual-language.md), [`list-screens-share-one-pattern.md`](../../../docs/conventions/list-screens-share-one-pattern.md), [`payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`payments-never-guess-paid-state.md`](../../../docs/domain/payments-never-guess-paid-state.md).
- Variety matrix (dates, not tenant data): today in January–September (season year = calendar year) and October–December (season year = next year); a club fully paid, partly paid (cuota yes, some licences missing), not paid, and deregistered (absent from the summary).

## 🪜 Phases

### Phase 1: Clubs list shows members and season payment

Super admin rows join the all-clubs summary for the current season by `club_id`: members count, a ring "con licencia" (members_with_license of total_members) and a "Cuota pagada" / "Cuota pendiente" pill. No summary for a club (deregistered or summary not loaded) shows nothing, never "pendiente". "Dar de baja" moves to the row `RowActions` menu with its confirmation dialog.

- [ ] Tests in `ClubList.test.tsx`: shows members and ring for a club in the summary; shows "Cuota pagada" / "Cuota pendiente"; shows no payment state while the summary is missing; "Dar de baja" is a menu item that opens the confirmation; club admins see neither.
- [ ] Implement in `ClubList.tsx` using `useAllClubsPaymentSummaryQuery(insuranceSeasonYear(today))`; `DeregisterClubButton` accepts a controlled open state or a menu trigger.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: One season everywhere

Pendientes, Historial and Inicio name the same season, today "Temporada 2026-27". Historial opens on `defaultPaymentYear(today)` and its header reads "Temporada {seasonLabel(year)}"; the amber "Ver 2027" box goes. Inicio counts clubs paid for the season year (`insurance_season_year(now)`) instead of the calendar year.

- [ ] Tests: `ClubPaymentsPage.test.tsx` opens on the season in October and in September, header "Temporada 2026-27", no amber box; `test_dashboard_*` counts transactions of the season year in October; Pendientes header starts with "Temporada 2026-27".
- [ ] Implement in `useClubPaymentsContext.tsx`, `ClubPaymentsPage.tsx`, `dashboard.py`.
- [ ] Copy: Historial "Temporada {season}"; year picker options labelled by season.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: Touch targets

- [ ] RowActions menu items, inline `TextButton` and the cover remove button reach 44px with `pointer-coarse:`; tests assert the class on each primitive.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 1: the Clubs list with members and season payment.

One season, one turtle: 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
