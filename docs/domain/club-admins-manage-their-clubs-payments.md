# 🎯 Club admins manage their club's payments

## 💡 Convention

A club admin sees and changes the payments of **their own club** the same way the super admin does for every club: register a manual payment, edit or delete a transaction or a member's payment line, mark it paid or pending, and refund it. The owner decided this on 2026-10-29, knowing a club admin can now mark as paid something the federation never received.

The backend holds them to their club on every write:

- A transaction is checked by its club (`_require_stored_payment_access` in `payments.py`), a payment line by its member's club (`_require_line_access` in `member_payments.py`).
- A manual payment needs the club to be theirs **and** every assigned member to belong to it, so a club admin cannot pay another club's member through their own club.
- An unknown id answers `403` to a club admin, like another club's id, so ids cannot be probed.
- Anyone who is neither super admin nor club admin gets `403`.
- The all-clubs summary stays super admin only.

In the panel, `canManagePayments` / `canEdit` is `isAssociationAdmin() || isClubAdmin()`.

## 🏆 Benefits

- The federation no longer has to fix every club's mistake by hand.
- Clubs that pay in cash or by transfer can record it themselves.

## 👀 Examples

### ✅ Good: a write checks the record's club before running

```python
await _require_stored_payment_access(ctx, payment_id, payment_repository, member_repository)
```

### ❌ Bad: check only the role

```python
require_club_admin_ctx(ctx)   # any club admin edits any club's payment
```

## 🧐 Real world examples

- [`payments.py`](../../backend/src/infrastructure/web/routers/payments.py)
- [`member_payments.py`](../../backend/src/infrastructure/web/routers/member_payments.py)
- [`test_club_admin_manages_payments.py`](../../backend/tests/api/test_club_admin_manages_payments.py)

## 🔗 Related agreements

- [Roles and permissions](roles-and-permissions.md)
- [A payment line shows a date only when it is paid](a-payment-line-shows-a-date-only-when-paid.md)
