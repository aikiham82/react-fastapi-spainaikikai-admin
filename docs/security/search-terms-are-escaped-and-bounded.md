# 🎯 Search terms are escaped and bounded

## 💡 Convention

Text a user types into a search never reaches MongoDB as a pattern: it goes through `re.escape` before `$regex`, and the query parameter carries `Query(..., max_length=100)` so an oversized term answers `422` before any query runs.

A member name search goes through `name_search_filter`: it escapes each character, requires every typed word in `first_name` or `last_name`, and lets an unaccented vowel, `n` or `c` match its accented forms, so "lucia fernandez" finds "Lucía Fernández Soto".

## 🏆 Benefits

- Until 2026-10-29 the federation admin could not find a member by typing their first name and surname without the accent: the whole term was matched against one field at a time, and accents had to match exactly.
- Until 2026-10-27 the licence and member searches passed the term raw. A name with a bracket, `García (Jr`, answered `500`, and `.*` listed every member; a crafted pattern could stall the database.
- A term over ~32 KB, or one with a NUL byte, makes Mongo raise `OperationFailure`, which surfaced as a `500`. The length cap turns it into a validation error.

## 👀 Examples

### ✅ Good: escaped and capped

```python
search: Optional[str] = Query(None, max_length=100),
...
collection.find(name_search_filter(search))
```

### ❌ Bad: the term is the pattern

```python
search: Optional[str] = None,
...
{"first_name": {"$regex": search, "$options": "i"}}
```

## 🧐 Real world examples

- [`backend/src/infrastructure/adapters/repositories/name_search.py`](../../backend/src/infrastructure/adapters/repositories/name_search.py): `name_search_filter`.
- [`backend/src/infrastructure/web/routers/licenses.py`](../../backend/src/infrastructure/web/routers/licenses.py): `get_licenses`.
- [`backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py`](../../backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py): `search_by_name`, `find_all_by_email`.
- [`backend/tests/api/test_licenses_search.py`](../../backend/tests/api/test_licenses_search.py)

## 🔗 Related agreements

- [`security-guidelines.md`](security-guidelines.md)
- [`auth-endpoints.md`](auth-endpoints.md)
