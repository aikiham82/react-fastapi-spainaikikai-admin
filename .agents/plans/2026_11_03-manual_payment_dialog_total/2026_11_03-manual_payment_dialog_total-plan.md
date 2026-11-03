---
name: "Manual payment dialog total"
description: "The manual payment dialog total counts the club fee once, as the server charges it"
created_at: "2026-11-03T12:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Manual payment dialog total

## Context

`RegisterManualPaymentUseCase` charges the club fee once per payment, whether it comes from `include_club_fee`, from one member's `payment_types`, or from several. `ManualPaymentModal` adds it for every member who has it ticked and again for the checkbox, so whoever registers the payment sees more than is charged.

With production prices (club fee 100 €, Shidoin 70 €), two members with the club fee and Shidoin on one of them show 270 € and charge 170 €.

Every other type in the dialog catalog has a price mapping on both sides and is charged per member, so the club fee is the only difference. The charge itself is right and nothing stored changes.

Matrix of cases, using the test prices (club fee 50 €, KYU 30 €):

| Club fee ticked on | Other lines | Shown and charged |
|---|---|---|
| Nowhere | KYU | 30 € |
| Checkbox | KYU | 80 € |
| One member | KYU | 80 € |
| Two members | KYU | 80 € |
| Checkbox and one member | KYU | 80 € |

## Phase 1: the total counts the club fee once

### Public contracts

- No endpoint, stored shape or copy changes.
- Test suite `ManualPaymentModal.test.tsx`: `counts the club fee once however it is ticked`.

### To do

- [ ] Write the failing test with the rows of the matrix.
- [ ] Count the club fee once in the `total` of `ManualPaymentModal.tsx`.
- [ ] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [ ] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

## Next step

Implement Phase 1.

Plan powered by [Codely](https://codely.com) 🐢
