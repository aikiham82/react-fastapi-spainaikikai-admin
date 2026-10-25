# 🎯 Update use cases take named fields

## 💡 Convention

An update use case lists every field it can change as a named parameter, converts each one to its domain type, and lets the entity enforce its rules. Never `**kwargs` plus `setattr`, and the update DTO declares every field the form sends, typed with the domain enum or `NaiveDatetime`.

## 🏆 Benefits

- 2026-10-25: the licence, insurance and member edits looked editable but were not. `setattr` stored raw strings where the repository expects enums (`'str' object has no attribute 'value'`, a 500), and fields missing from the DTO (`expiry_date`, `dni`, insurance type, company and policy) were dropped by Pydantic without a word.
- A named parameter that is not in the DTO fails a test; a dropped key in `**kwargs` does not.
- Enum-typed DTO fields answer 422 on an unknown value instead of 500, and `NaiveDatetime` keeps MongoDB's dates naive.

## 👀 Examples

### ✅ Good: named fields, domain types, entity rules

```python
async def execute(self, license_id: str, grade: Optional[str] = None,
                  expiration_date: Optional[datetime] = None,
                  technical_grade: Optional[str] = None) -> License:
    license = await self.license_repository.find_by_id(license_id)
    if technical_grade is not None:
        license.technical_grade = TechnicalGrade(technical_grade)
    license.update_dates(None, expiration_date)
```

### ❌ Bad: whatever arrives is written as is

```python
for key, value in kwargs.items():
    if value is not None and hasattr(license, key):
        setattr(license, key, value)
```

## 🧐 Real world examples

- [`update_license_use_case.py`](../../backend/src/application/use_cases/license/update_license_use_case.py)
- [`update_insurance_use_case.py`](../../backend/src/application/use_cases/insurance/update_insurance_use_case.py)
- [`naive_datetime.py`](../../backend/src/infrastructure/web/dto/naive_datetime.py)

## 🔗 Related agreements

- [`backend.md`](backend.md)
- [`../domain/data-model.md`](../domain/data-model.md)
