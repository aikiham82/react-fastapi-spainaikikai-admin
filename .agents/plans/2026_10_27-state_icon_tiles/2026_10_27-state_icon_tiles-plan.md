---
name: "2026_10_27-state_icon_tiles"
description: "Small status tiles (AC/RC insurance, paid licence/insurance marks) show their state with an icon, not by colour alone."
created_at: "2026-10-27T15:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"
implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"

last_implementation_at: "2026-10-27T15:20:00Z"
has_completed_all_phases: true
---

# State icons on small tiles

## 🎯 Goal

The AC/RC insurance tiles in Miembros and the paid marks in Pagos > Historial carry a small state icon in their corner, so their state never relies on colour alone ([`ui-visual-language.md`](../../../docs/conventions/ui-visual-language.md)).

## 👀 Context

- `InsuranceTile` in [`MemberBadges.tsx`](../../../frontend/src/features/members/components/MemberBadges.tsx), rendered by [`MemberList.tsx`](../../../frontend/src/features/members/components/MemberList.tsx) (mobile card and table).
- `PaidMark` in [`ClubPaymentDetail.tsx`](../../../frontend/src/features/club-payments/components/ClubPaymentDetail.tsx).
- Tone classes and tone icons in [`status-badge.tsx`](../../../frontend/src/components/ui/status-badge.tsx); shared tiles in [`graphic.tsx`](../../../frontend/src/components/ui/graphic.tsx).
- `/api/dashboard/stats` for plain members was also on the list: already refused with 403 by the router-level `require_admin_access` (commit c4316e2, test `test_admin_api_requires_admin.py`), so it is out of scope.
- Variety: not tenant data; the four tones ok, warn, bad and neutral.

## 🪜 Phases

### Phase 1: State tiles with an icon

- [x] `graphic.tsx`: `StateTile({ tone, label, children })`, a 30px tinted tile with its content and a corner icon from the shared tone icons; `status-badge.tsx` exports `toneIcons`.
- [x] Tests: `graphic.test.tsx` shows one icon per tone; `MemberList.test.tsx` asserts the icon on the AC/RC tiles; `ClubPaymentDetail` paid marks show check or cross.
- [x] Use it in `InsuranceTile` and `PaidMark`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

All phases implemented. Next: review and QA.

Seen without colour, and done: 🐢 💨 👁️ (Turbotuga™, [Codely](https://codely.com)'s mascot).
