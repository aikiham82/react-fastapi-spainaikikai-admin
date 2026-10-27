# 🎯 Search terms are escaped and bounded

## 💡 Convention

Text a user types into a search never reaches MongoDB as a pattern: it goes through `re.escape` before `$regex`, and the query parameter carries `Query(..., max_length=100)` so an oversized term answers `422` before any query runs.

## 🏆 Benefits

- Until 2026-10-27 the licence and member searches passed the term raw. A name with a bracket, `García (Jr`, answered `500`, and `.*` listed every member; a crafted pattern could stall the database.
- A term over ~32 KB, or one with a NUL byte, makes Mongo raise `OperationFailure`, which surfaced as a `500`. The length cap turns it into a validation error.

## 👀 Examples

### ✅ Good: escaped and capped

```python
search: Optional[str] = Query(None, max_length=100),
...
{"first_name": {"$regex": re.escape(search), "$options": "i"}}
```

### ❌ Bad: the term is the pattern

```python
search: Optional[str] = None,
...
{"first_name": {"$regex": search, "$options": "i"}}
```

## 🧐 Real world examples

- [`backend/src/infrastructure/web/routers/licenses.py`](../../backend/src/infrastructure/web/routers/licenses.py): `get_licenses`.
- [`backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py`](../../backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py): `search_by_name`, `find_all_by_email`.
- [`backend/tests/api/test_licenses_search.py`](../../backend/tests/api/test_licenses_search.py)

## 🔗 Related agreements

- [`security-guidelines.md`](security-guidelines.md)
- [`auth-endpoints.md`](auth-endpoints.md)
