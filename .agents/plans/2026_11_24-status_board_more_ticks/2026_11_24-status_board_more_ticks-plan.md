---
name: "Status board: member and insurance ticks"
description: "The member status board also ticks member active/deregistered and accident and RC insurance, each through the action that already exists"
created_at: "2026-11-24T16:00:00Z"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Fable"
    version: "5.2"
    reasoning_effort: "low"

last_implementation_at: "2026-11-24T16:30:00Z"
has_completed_all_phases: "false"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Fable"
    version: "5.2"
    reasoning_effort: "low"
---

# Status board: member and insurance ticks

## 🎯 Goal

On "Estado de socios" the secretary can also tick member active or deregistered, accident insurance and RC insurance, not only the licence paid. No tick writes a status by hand: each one runs the action the panel already has.

## 👀 Context

Follow-up asked by Guille (secretary) on 2026-11-24, after the board went live (plan [`2026_11_24-member_status_board`](../2026_11_24-member_status_board/2026_11_24-member_status_board-plan.md)).

Rules:

- [`docs/domain/validity-follows-dates.md`](../../../docs/domain/validity-follows-dates.md): an insurance is in force by its dates; the only status set by hand is the annulment, and "Reactivar" removes it.
- [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md): a title includes the RC; an insurance paid in the app covers the season in force today; a paid tick is a real payment.
- [`docs/domain/a-deregistered-members-licence-is-history.md`](../../../docs/domain/a-deregistered-members-licence-is-history.md).
- [`docs/conventions/list-screens-share-one-pattern.md`](../../../docs/conventions/list-screens-share-one-pattern.md), [`docs/conventions/ui-visual-language.md`](../../../docs/conventions/ui-visual-language.md).

Code:

- [`MemberStatusBoard.tsx`](../../../frontend/src/features/member-status-board/components/MemberStatusBoard.tsx): `PaidToggle`, `lockReason`, `STATUS_COLUMNS`.
- [`members.py`](../../../backend/src/infrastructure/web/routers/members.py) `member_status_rows`, [`member_dto.py`](../../../backend/src/infrastructure/web/dto/member_dto.py) `MemberStatusRowResponse`.
- `useChangeMemberStatusMutation` ([`useMemberMutations.ts`](../../../frontend/src/features/members/hooks/mutations/useMemberMutations.ts)): `PATCH /members/{id}/status`, invalidates `['members']`, which covers the board key.
- `useUpdateInsuranceMutation` ([`useInsuranceMutations.ts`](../../../frontend/src/features/insurance/hooks/mutations/useInsuranceMutations.ts)): `PUT /insurances/{id}` with `annulled`, super admin only; invalidates `['insurance']` only, so the board must also refresh.
- [`ManualPaymentModal.tsx`](../../../frontend/src/features/club-payments/components/ManualPaymentModal.tsx): `initialPaymentTypes`, `initialPayerName`.
- `refuse_lines_already_paid`: a second insurance line for the same season is refused, so an annulled insurance of the season in force is reactivated, never paid again.

Real data matrix (production, read-only, 2026-11-24). Each row is a test case and a QA row:

| Variety | Production count |
|---|---|
| Accident insurance in force / expired by date | 193 / 436 |
| RC insurance in force / expired by date | 11 / 436 |
| Member with two insurances of one type in force | 0 |
| Annulled insurance | 0 today; the untick creates them |
| Instructor (title includes the RC) | 22 titles paid for 2026 |
| Member without any insurance, deregistered member (237) | present |

## 🪜 Phases

### Phase 1: member tick

- [x] The "Miembro" column gets a checkbox, ticked when the member is active. Unticking asks with the copy Miembros uses ("Dar de baja", "Se dará de baja a "{nombre}". El miembro quedará inactivo y será excluido de los pagos anuales. Esta acción es reversible.") and ticking with "Reactivar miembro" / "Se reactivará a "{nombre}". El miembro volverá a estar activo y será incluido en los pagos anuales."; both call `useChangeMemberStatusMutation`.
- [x] Component tests: untick confirms and deregisters, tick confirms and reactivates, cancel changes nothing, disabled while the request is in flight.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: accident and RC insurance ticks

- [ ] `MemberStatusRowResponse` gains `accident_insurance_id`, `accident_insurance_annulled`, `rc_insurance_id`, `rc_insurance_annulled`: per type, the insurance whose dates are in force today with the latest end date, annulled or not; null when none.
- [ ] Backend tests in `tests/api/test_member_status_board.py`: in force gives its id, expired by date gives none, annulled in force gives its id and `annulled`, the latest end date wins, no insurance gives none.
- [ ] The Accidentes and RC columns get a checkbox, ticked when that insurance is in force. Tick without a season insurance opens `ManualPaymentModal` with `seguro_accidentes` or `seguro_rc` pre-ticked and the member as payer. Tick on an annulled insurance of the season reactivates it (`annulled: false`). Untick asks "¿Anular el seguro de accidentes de {nombre}?" / "¿Anular el seguro RC de {nombre}?" with "Deja de contar como vigente. Puedes volver a marcarlo para reactivarlo." and "Anular seguro", then sends `annulled: true`. The board refetches after either.
- [ ] Locked with a visible reason: the RC of an instructor without RC in force ("Va incluido en su título"), and any insurance tick of a deregistered member or a member without club.
- [ ] Component tests: tick opens the payment with the right item, untick confirms and annuls with the insurance id, tick on an annulled one reactivates without opening the payment, instructor RC locked, deregistered member locked, in-force RC of an instructor can still be unticked.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 2: the insurance ticks.

More boxes to tick, carried by 🙋 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
