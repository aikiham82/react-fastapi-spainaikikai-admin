# 🎯 Testing strategy

## 💡 Convention

Tests mirror the architecture they cover, and the suite must stay green before any commit.

**Backend** (`backend/tests/`), organised by layer:

```
tests/
├── domain/           entities and their validation rules
├── application/      use cases, with ports replaced by test doubles
├── infrastructure/   repository adapters and web-layer wiring
├── api/              endpoint behaviour through FastAPI
└── conftest.py       shared fixtures
```

Coverage is enforced by `[tool.pytest.ini_options]` in [`backend/pyproject.toml`](../../backend/pyproject.toml); the run fails below the floor. The floor is currently **50%** against actual coverage of 50.59%, and is a **ratchet**: raise it as coverage improves, never lower it. Every test carries a marker so suites can be selected: `unit`, `integration`, `slow`, `auth`, `api`, `service`, `repository`, `domain`.

**Frontend**: Vitest with React Testing Library. Tests sit beside the code they cover, in `__tests__/` directories within the feature.

Test behaviour through the public entry point of the layer under test. A domain test constructs an entity; a use-case test injects fake ports; an API test issues a request. Do not reach into private attributes to assert state.

## 🏆 Benefits

- A failing test names the layer at fault, so the search starts in the right place.
- Use cases tested against fake ports run in milliseconds and need no database.
- The coverage gate is machine-enforced, so it does not depend on anyone remembering.
- Markers let a tight loop run `-m unit` while CI runs everything.

## 👀 Examples

### ✅ Good: a use case tested against a fake port

```python
@pytest.mark.unit
async def test_create_member_rejects_duplicate_license() -> None:
    repository = InMemoryMemberRepository([a_member(license_number="1234")])
    use_case = CreateMemberUseCase(repository)

    with pytest.raises(MemberAlreadyExistsError):
        await use_case.execute(a_member(license_number="1234"))
```

Fast, deterministic, and it states the business rule in its name.

### ❌ Bad: the same rule tested through the whole stack

```python
async def test_create_member(client, mongodb):
    await mongodb.members.insert_one({"license_number": "1234"})
    response = await client.post("/members", json={"license_number": "1234"})
    assert response.status_code == 409
```

This needs a live database, it is slow, and when it fails it does not say whether the bug is in the rule, the router, the mapper or the adapter.

## 🧐 Real world examples

- [`backend/tests/domain/`](../../backend/tests/domain)
- [`backend/tests/application/`](../../backend/tests/application)
- [`backend/tests/api/`](../../backend/tests/api)
- [`backend/tests/conftest.py`](../../backend/tests/conftest.py)
- [`backend/pyproject.toml`](../../backend/pyproject.toml)
- [`frontend/src/core/data/__tests__/`](../../frontend/src/core/data/__tests__)

## 🔗 Related agreements

- [`../architecture/backend-hexagonal.md`](../architecture/backend-hexagonal.md)
- [`../dev-tooling/development-commands.md`](../dev-tooling/development-commands.md)
