# 🎯 Production data changes

## 💡 Convention

Production is read freely and written only with the owner's explicit OK for that change. A write:

1. **Dry-runs first**, printing exactly what it will touch, and waits for the OK on that list.
2. **Backs up** every document it changes to `~/backups/spainaikikai/backup-<what>-<date>.json` before writing.
3. **Mirrors the use case** it stands in for: same fields, same side effects (e.g. killing reset tokens when an account changes hands, deactivating instead of deleting), with asserts that the data is in the expected state.
4. **Re-reads** the result and reports it.

Two traps: the local `backend/.env.production` is not production's real configuration (its `FRONTEND_BASE_URL` is `http://localhost:5173` and it has no SMTP password), so anything that builds links or sends mail must go through production's own public endpoints (e.g. `POST /auth/password-reset/request`). And a push is not a deploy: confirm with `https://api.spainaikikai.org/openapi.json` or the admin bundle.

## 🏆 Benefits

- 2026-10-26/27: club accounts were relinked, 7 accounts assigned and 5 clubs deregistered in production; each had a backup and a re-read, so any of them can be undone.
- A grant run with the local configuration created a link to `localhost` and sent no mail; the public reset endpoint delivered the real one.

## 👀 Examples

### ✅ Good: dry-run, backup, mirror, verify

```python
assert user["is_active"] and placeholder["last_name"] == "(Club Admin)"
open(backup_path, "w").write(json_util.dumps(backup))
db.password_reset_tokens.update_many({"user_id": uid, "used_at": None}, {"$set": {"used_at": now}})
db.users.update_one({"_id": uid}, {"$set": {"member_id": person_id}})
print(db.users.find_one({"_id": uid})["member_id"])
```

### ❌ Bad: a one-line update with no trace

```python
db.users.update_one({"email": email}, {"$set": {"member_id": person_id}})
```

## 🧐 Real world examples

- Backups in `~/backups/spainaikikai/` (outside the repository; never commit them).

## 🔗 Related agreements

- [No production data in the repository](../testing/no-production-data.md)
- [A club is switched off only by deregistration](../domain/a-club-is-switched-off-only-by-deregistration.md)
