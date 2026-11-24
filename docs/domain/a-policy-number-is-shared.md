# 🎯 Domain: a policy number is shared, not an identity

## 💡 Convention

An insurance is identified by its **member, type and season**, never by its policy number. Every insurance generated from a payment carries the placeholder `PENDIENTE` until the insurer issues the real number, and a collective policy gives many members the same one.

So nothing rejects, looks up or updates a single insurance by policy number alone. The Excel import finds the insurances sharing the row's policy number and keeps the one of the row's member (by DNI) and type, using the start date to tell seasons apart. A row that still fits several is an error for that row and changes nothing.

## 🏆 Benefits

- An insurance can be created by hand with the same placeholder the payments use.
- An imported row can only touch the insurance of the member it names.
- An ambiguous row fails loudly instead of updating whichever insurance the database returns first.

## 👀 Examples

### ✅ Good: narrow the insurances sharing the number to the row's member, type and season

```python
matches = _insurances_meant_by_row(
    await insurance_repo.find_all_by_policy_number(policy_number),
    member.id if member else None,
    insurance_type,
    _parse_date(start_date_str),
)
```

### ❌ Bad: treat the policy number as unique

```python
existing = await insurance_repo.find_by_policy_number(policy_number)
if existing:
    raise InsuranceAlreadyExistsError("Insurance with this policy number already exists")
```

With over a thousand insurances numbered `PENDIENTE`, this refuses every new one, and the same lookup in the import updates an arbitrary member's insurance.

## 🧐 Real world examples

- 2026-11-24: the federation created two members and could give only one of them an accident insurance. The first was created with an invented number and renamed to `PENDIENTE`; the second, typed as `PENDIENTE` from the start, was refused as a duplicate.
- The import ran in update mode from the panel and matched rows by policy number alone, so a `PENDIENTE` row would have overwritten the first of those insurances found.

## 🔗 Related agreements

- [`payment-cycles.md`](payment-cycles.md): insurance is its own payment cycle.
- [`validity-follows-dates.md`](validity-follows-dates.md): what makes an insurance in force.
- [`../conventions/excel-import-cells-are-text.md`](../conventions/excel-import-cells-are-text.md): how import cells are read.

Told apart by member and season by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
