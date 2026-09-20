# 🎯 Backend conventions

## 💡 Convention

Rules that apply to every change under `backend/src/`:

- **Dependency injection throughout the web layer.** Routers receive their use case from `dependencies.py`; they never construct one.
- **One shape for every use case**: collaborators through the constructor, a single public `execute` method. No second public entry point, no `run`, no `handle`.
- **Entities validate themselves** in `__post_init__` and in their business methods. An invalid entity must be impossible to construct.
- **Repositories use Motor** and live in `adapters/repositories/`. Nothing outside that package imports Motor or names a collection.
- **DTOs are Pydantic models** with real validation, not bare containers.
- **Domain exceptions map to HTTP status codes** at the router boundary. A domain exception never escapes as a 500.

## 🏆 Benefits

- A use case can be constructed in a test with fakes, so business rules are verifiable without a database.
- One method per use case makes the unit of behaviour obvious and keeps the class from drifting into a service grab-bag.
- Validation at construction means no downstream code needs defensive checks.
- Mapping exceptions at the boundary gives the client a meaningful status instead of an opaque failure.

## 👀 Examples

### ✅ Good: a router delegating, with the exception mapped

```python
@router.post("/members", response_model=MemberResponse, status_code=201)
async def create_member(
    dto: CreateMemberRequest,
    use_case: CreateMemberUseCase = Depends(get_create_member_use_case),
) -> MemberResponse:
    try:
        member = await use_case.execute(map_create_request_to_member(dto))
    except MemberAlreadyExistsError as error:
        raise HTTPException(status_code=409, detail=str(error))
    return map_member_to_response(member)
```

The router validates, delegates, maps the failure and maps the result. It holds no rule of its own.

### ❌ Bad: a use case with several public methods and its own wiring

```python
class MemberService:
    def __init__(self) -> None:
        self._db = AsyncIOMotorClient(settings.mongo_uri).spainaikikai

    async def create(self, data: dict) -> dict: ...
    async def update(self, member_id: str, data: dict) -> dict: ...
    async def delete(self, member_id: str) -> None: ...
```

It builds its own dependency so it cannot be tested with a fake, it exposes three entry points so the class has no single reason to change, and it passes `dict` around so nothing is validated.

## 🧐 Real world examples

- [`backend/src/application/use_cases/member/create_member_use_case.py`](../../backend/src/application/use_cases/member/create_member_use_case.py)
- [`backend/src/infrastructure/web/dependencies.py`](../../backend/src/infrastructure/web/dependencies.py)
- [`backend/src/infrastructure/web/routers/members.py`](../../backend/src/infrastructure/web/routers/members.py)
- [`backend/src/infrastructure/web/mappers.py`](../../backend/src/infrastructure/web/mappers.py)
- [`backend/src/domain/entities/member.py`](../../backend/src/domain/entities/member.py)

## 🔗 Related agreements

- [`../architecture/backend-hexagonal.md`](../architecture/backend-hexagonal.md)
- [`../testing/testing-strategy.md`](../testing/testing-strategy.md)
- [`../security/security-guidelines.md`](../security/security-guidelines.md)
