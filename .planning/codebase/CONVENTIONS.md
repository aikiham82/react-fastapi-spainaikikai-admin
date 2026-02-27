# Coding Conventions

**Analysis Date:** 2026-02-27

## Naming Patterns

**Files:**
- **Backend Python**: `snake_case` for all files
  - Entities: `user.py`, `member.py`, `club.py` (single entity per file)
  - Use cases: `create_member_use_case.py`, `update_member_use_case.py` (verb + entity + suffix)
  - Repositories: `mongodb_user_repository.py` (adapter type + entity + suffix)
  - DTOs: `user_dto.py`, `member_dto.py` (entity + suffix)
  - Routers: `users.py`, `members.py` (entity plural)
  - Tests: `test_user_entity.py`, `test_member_router.py` (test_ prefix)

- **Frontend TypeScript**: Mix of patterns
  - Page files: `*.page.tsx` (login.page.tsx, members.page.tsx)
  - Components: `PascalCase` (SeminarList.tsx, SeminarForm.tsx)
  - Hooks: `use{Feature}.tsx` (useAuthContext.tsx, useSeminarContext.tsx)
  - Services: `snake_case.service.ts` (seminar.service.ts, auth.service.ts)
  - Schemas/Types: `snake_case.schema.ts` (member.schema.ts, auth.schema.ts)
  - Tests: `*.test.tsx`, `*.spec.tsx` in `__tests__` directories

**Functions:**
- **Backend**: `snake_case` for all functions and methods
  - Use case public method: single `execute()` method per class
  - Private helpers: prefixed with `_` (e.g., `_pick_primary_license`, `_build_license_summary`)
  - Repository methods: `find_by_*`, `find_all`, `create`, `update`, `delete`, `exists`

- **Frontend**: `camelCase` for function exports
  - Hooks: `use{Feature}`, `use{Feature}Context` (useAuthContext, useSeminarContext)
  - Mutation hooks: `use{Feature}Mutation` (useLoginMutation, useCreateSeminarMutation)
  - Query hooks: `use{Feature}sQuery`, `use{Feature}Query` (useSeminarsQuery, useSeminarQuery)
  - Service functions: `camelCase` (getSeminars, createSeminar, updateSeminar)
  - Utilities: descriptive names (formatDateTime, _buildLicenseSummary)

**Variables:**
- **Backend**: `snake_case` for all variables
  - Protected attributes: `self._attribute`
  - Domain entities: type hints with `Optional` (user_id: Optional[str] = None)
  - Boolean flags: `is_active`, `is_super_admin`, `has_accident`
  - Collections: plural nouns (members, licenses, insurances)

- **Frontend**: `camelCase` for all variables
  - State: `isLoading`, `isAuthenticated`, `selectedSeminar`
  - Derived values: `effectiveUser`, `effectiveRole`, `clubId`
  - Collections: plural nouns (seminars, licenses, insurances)
  - Callbacks: `onSuccess`, `onOpenChange`, `selectPriceConfiguration`

**Types/Interfaces:**
- **Backend**: `PascalCase` for classes and Enums
  - Domain entities: `User`, `Member`, `Club`, `License` (Pydantic dataclasses)
  - Enums: `GlobalRole`, `MemberStatus`, `LicenseStatus`
  - DTOs: `UserCreate`, `MemberResponse`, `MemberUpdate` (Entity + action)
  - Exceptions: `UserNotFoundError`, `MemberAlreadyExistsError`

- **Frontend**: `PascalCase` for interfaces
  - Interfaces: `AuthContextType`, `SeminarContextType`, `PriceConfigurationContextType`
  - Type unions: `GlobalRole`, `ClubRole`, `UserRole`
  - Request/Response: `AuthRequest`, `AuthResponse`, `CreateSeminarRequest`

## Code Style

**Formatting:**
- **Backend**: Python 3.11+, PEP 8 compliance (no explicit formatter)
  - 4-space indentation
  - No strict line length limit observed
  - Imports grouped: stdlib, third-party, local

- **Frontend**: ESLint 9.30.1 enforced
  - 2-space indentation
  - Single quotes required
  - Semicolons required
  - Trailing commas allowed in multi-line

**Linting:**
- **Backend**: Pytest for quality enforcement via tests
  - Pydantic validation in `__post_init__` methods
  - Type hints required (enforced by IDE/pre-commit)

- **Frontend**: ESLint configuration at `frontend/eslint.config.js`
  - Rules: `@eslint/js`, `typescript-eslint`, `react-hooks`, `react-refresh`
  - Run: `npm run lint` (manual fixes required, no auto-format)

## Import Organization

**Order (Backend):**
1. Standard library (datetime, typing, enum)
2. Third-party (fastapi, pydantic, motor)
3. Domain layer (src.domain.entities, src.domain.exceptions)
4. Application layer (src.application.ports, src.application.use_cases)
5. Infrastructure layer (src.infrastructure.adapters, src.infrastructure.web)

**Example:**
```python
from datetime import datetime
from typing import Optional
from src.domain.entities.member import Member, MemberStatus
from src.domain.exceptions.member import MemberAlreadyExistsError
from src.application.ports.member_repository import MemberRepositoryPort
```

**Order (Frontend):**
1. React/core library
2. Third-party UI/utils (@tanstack, zod, radix-ui, lucide-react)
3. Type imports (type { ... })
4. Local features (@/features/...)
5. Local UI components (@/components/ui/...)
6. Local core utilities (@/core/...)

**Path Aliases (Frontend):**
- `@/features/` → feature modules
- `@/components/ui/` → reusable UI
- `@/core/` → shared infrastructure
- `@/test-utils/` → test helpers

## Error Handling

**Backend:**
- Domain exceptions map to HTTP status codes
  - `UserNotFoundError` → 404
  - `UserAlreadyExistsError` → 400
  - `InvalidClubForMemberError` → 403

Pattern in routers:
```python
try:
    member = await use_case.execute(...)
except MemberAlreadyExistsError as e:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
```

**Frontend:**
- Service functions throw on HTTP errors
- Mutations use `onError` callbacks
- Toast notifications for errors: `toast('Error message')`
- Fallback messages: `error instanceof Error ? error.message : 'Default'`

## Logging

**Backend:**
- Python built-in logging (implicit through FastAPI/uvicorn)
- Pydantic validation errors logged implicitly
- No centralized logging wrapper visible

**Frontend:**
- `console.error` mocked in tests for cleaner output
- Toast notifications for user errors
- No centralized logging service
- React Query DevTools for debugging

## Comments

**When to Comment:**

**Backend:**
- Class-level docstrings: purpose and key responsibilities
- Method docstrings: parameters, return type, exceptions
- Implementation: explain *why*, not *what*

Example:
```python
def _pick_primary_license(licenses: List[License]) -> Optional[License]:
    """Select the most relevant license: prefer active with latest expiry, fallback to most recent."""
```

**Frontend:**
- Inline comments for complex logic and decisions
- Document authorization/access control
- Mark workarounds clearly

Example:
```typescript
// Derive effective role from backend fields
// Use currentUserData (React Query) first to avoid race condition with useState
```

## Function Design

**Size:**
- Backend: Use cases kept small (30-70 lines), single `execute()` method
- Frontend: Hooks can reach 100+ lines managing state
- Extracted helpers for reusability (e.g., `_buildLicenseSummary`)

**Parameters:**
- **Backend**: Explicit typed parameters in `execute()`
  - No kwargs; use specific parameters
  - All parameters type-hinted: `first_name: str`, `club_id: Optional[str] = None`

- **Frontend**: Props interfaces with destructuring
  - Optional props marked with `?`
  - Callbacks as function types: `onSuccess: (data: T) => void`

**Return Values:**
- **Backend**: Always domain entities, never raw dicts
  - Use cases return `Member`, `User`, etc.
  - Async functions use consistent `async`/`await`

- **Frontend**: Typed returns
  - Mutations: `{ action, isLoading, error, isSuccess }`
  - Queries: `{ data, isLoading, error, isSuccess }`
  - Services: `Promise<Seminar>`, `Promise<void>`

## Module Design

**Exports:**
- **Backend**: One main class/function per file
  - `create_member_use_case.py` → `CreateMemberUseCase`
  - `user.py` → `User`, `GlobalRole`
  - No barrel exports in `__init__.py`

- **Frontend**: Multiple exports per file allowed
  - Services export individual functions + named object
  - Hooks export single hook function
  - Components export single component + interfaces
  - Schemas export interfaces, types, utilities

Example:
```typescript
export const getSeminars = async (...) => { ... }
export const createSeminar = async (...) => { ... }
export const seminarService = {
  getSeminars,
  createSeminar,
}
```

**Barrel Files:**
- **Backend**: Not used; explicit imports required
- **Frontend**: Minimal; consumers import directly from source

---

*Convention analysis: 2026-02-27*
