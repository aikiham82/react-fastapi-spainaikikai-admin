# 🎯 Unique optional fields

## 💡 Convention

A field that is **optional** but must be **unique when present** (a member's DNI, a member's email) follows two rules in the use case that enforces the uniqueness:

1. **Normalise first.** Trim the value (`(value or "").strip()`) once, and use that same normalised value both for the uniqueness lookup and for the entity that gets stored.
2. **Blank is exempt.** An empty value after normalising is "not provided", never a key. Skip the lookup entirely and store `""`.

MongoDB's `find_one({"dni": ""})` matches every document stored with an empty DNI, so a lookup on a blank value always finds "a duplicate" as soon as one member without the field exists.

## 🏆 Benefits

- A member without a DNI can be saved even when others without a DNI already exist. Before this rule, the second one got `409 "Ya existe un miembro con ese DNI"`.
- Normalising before both the check and the store means `"  12345678Z "` is caught as a duplicate of `"12345678Z"`, instead of creating a second identity.
- No member is stored with a whitespace-only value. The Excel importers only reject an empty DNI (`if not dni`), so several members sharing `"   "` would let a licence or payment row attach to any of them.

## 👀 Examples

### ✅ Good: normalise once, skip blanks, store the normalised value

```python
dni = (dni or "").strip()
if dni:
    existing_dni = await self.member_repository.find_by_dni(dni)
    if existing_dni:
        raise MemberAlreadyExistsError("Ya existe un miembro con ese DNI")

member = Member(dni=dni, ...)
```

### ❌ Bad: lookup on the raw value

```python
existing_dni = await self.member_repository.find_by_dni(dni)
if existing_dni:
    raise MemberAlreadyExistsError("Ya existe un miembro con ese DNI")
```

`dni=""` collides with every member without a DNI and answers a false `409`.

### ❌ Bad: strip only to test for emptiness

```python
if dni and dni.strip():
    existing_dni = await self.member_repository.find_by_dni(dni)
    ...
member = Member(dni=dni, ...)
```

`"   "` skips the check and is stored as typed, and `"  12345678Z "` is looked up raw, so it misses its trimmed twin.

## 🧐 Real world examples

- [`create_member_use_case.py`](../../backend/src/application/use_cases/member/create_member_use_case.py): DNI normalised and exempt when blank; the email check skips blanks too.
- [`test_create_member_use_case.py`](../../backend/tests/application/use_cases/member/test_create_member_use_case.py): empty, whitespace-only, padded and duplicate DNI cases.

Known gaps, not yet covered by this rule: there is no unique index on `dni`, so the check-then-insert can race, and the DNI is not case-normalised (`12345678z` vs `12345678Z`).

## 🔗 Related agreements

- [`data-model.md`](data-model.md): the MongoDB collections these fields live in.
- [`payment-cycles.md`](payment-cycles.md): why a wrongly matched member corrupts `license_paid`.
- [`../architecture/backend-hexagonal.md`](../architecture/backend-hexagonal.md): the rule belongs in the use case, not in the Mongo adapter.

Blank keys kept out of the index by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
