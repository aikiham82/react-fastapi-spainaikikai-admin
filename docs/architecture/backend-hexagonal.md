# 🎯 Backend: hexagonal architecture

## 💡 Convention

The backend is organised in three layers under `backend/src/`, and dependencies only ever point inwards: infrastructure depends on application, application depends on domain, and domain depends on nothing.

**Domain** (`src/domain/`)

- `entities/`: core business objects as `@dataclass`, validating in `__post_init__` and in their own business methods.
- `exceptions/`: domain-specific exceptions raised when a business rule is violated.

**Application** (`src/application/`)

- `ports/`: repository and service interfaces, declared as abstract contracts. The domain states what it needs; it never names who provides it.
- `use_cases/`: business orchestration. Each use case takes its collaborators through the constructor and exposes exactly **one** public `execute` method.

**Infrastructure** (`src/infrastructure/`)

- `adapters/repositories/`: MongoDB implementations of the ports, using the Motor async driver.
- `web/`: the FastAPI delivery layer.
  - `routers/`: thin controllers that delegate to a use case and map exceptions to HTTP status codes.
  - DTOs: Pydantic models validating requests and shaping responses.
  - `mappers*.py`: conversion between DTOs and domain entities, so neither side learns the other's shape.
  - `dependencies.py`: dependency injection wiring, with `@lru_cache()` on repository providers.

## 🏆 Benefits

- Business rules are testable without a database, a web server or a network.
- MongoDB is replaceable because nothing outside `adapters/` imports Motor.
- A use case reads as a single sentence of intent, so the reason a rule exists stays visible.
- Validation lives with the entity it protects, so an invalid object cannot be constructed anywhere in the system.

## 👀 Examples

### ✅ Good: a use case orchestrating through a port

```python
class CreateMemberUseCase:
    def __init__(self, member_repository: MemberRepository) -> None:
        self._member_repository = member_repository

    async def execute(self, member: Member) -> Member:
        if await self._member_repository.find_by_license_number(member.license_number):
            raise MemberAlreadyExistsError(member.license_number)
        return await self._member_repository.save(member)
```

The use case names `MemberRepository`, the port. It has one public method. It knows nothing about Mongo or HTTP.

### ❌ Bad: a router reaching past the application layer

```python
@router.post("/members")
async def create_member(dto: CreateMemberDTO, db = Depends(get_database)):
    if await db.members.find_one({"license_number": dto.license_number}):
        raise HTTPException(status_code=409, detail="Already exists")
    await db.members.insert_one(dto.model_dump())
```

The business rule now lives in a controller, the collection shape leaks into the web layer, and the rule cannot be tested or reused without spinning up FastAPI and MongoDB.

## 🧐 Real world examples

- [`backend/src/domain/entities/member.py`](../../backend/src/domain/entities/member.py)
- [`backend/src/application/ports/club_repository.py`](../../backend/src/application/ports/club_repository.py)
- [`backend/src/application/use_cases/member/create_member_use_case.py`](../../backend/src/application/use_cases/member/create_member_use_case.py)
- [`backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py`](../../backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py)
- [`backend/src/infrastructure/web/dependencies.py`](../../backend/src/infrastructure/web/dependencies.py)
- [`backend/src/infrastructure/web/routers/members.py`](../../backend/src/infrastructure/web/routers/members.py)

> Note: the web layer currently contains both a `dto/` and a `dtos/` directory. This is an unresolved inconsistency, not a convention. Follow whichever the surrounding module already uses, and do not introduce a third spelling.

## 🔗 Related agreements

- [`project-layout.md`](project-layout.md)
- [`../testing/testing-strategy.md`](../testing/testing-strategy.md)
