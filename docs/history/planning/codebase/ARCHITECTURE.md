# Architecture

**Analysis Date:** 2025-02-27

## Pattern Overview

**Backend: Hexagonal Architecture (Ports & Adapters)**
**Frontend: Feature-Based Architecture with Context + React Query**

This is a full-stack backoffice application for Aikido association management with clear separation of concerns. The backend implements strict hexagonal architecture with domain, application, and infrastructure layers. The frontend uses feature-scoped state management combined with React Query for server state.

**Key Characteristics:**
- Backend decouples business logic from external frameworks via ports (interfaces)
- Domain entities validate themselves in `__post_init__` and implement business methods
- Use cases orchestrate business logic with single public `execute()` method
- Repository implementations hide MongoDB details behind port contracts
- Frontend features are self-contained with data/hooks/components
- React Context manages feature state; React Query handles server synchronization
- Two-level role system: global user roles + club-scoped member roles

## Layers

### Backend Layers

**Domain Layer (`src/domain/`):**
- Purpose: Core business rules and entities independent of any framework
- Location: `src/domain/entities/`, `src/domain/exceptions/`
- Contains: Dataclass entities with business logic, domain-specific exceptions
- Depends on: Nothing (no external dependencies)
- Used by: Application layer (use cases)
- Examples: `Member`, `License`, `Payment`, `Club` entities with methods like `promote_to_admin()`, `deactivate()`, `change_club()`

**Application Layer (`src/application/`):**
- Purpose: Orchestrate business logic and coordinate repository/service interactions
- Location: `src/application/use_cases/`, `src/application/ports/`
- Contains: Use case classes with `execute()` method, port interfaces (abstract repository contracts)
- Depends on: Domain entities, port interfaces (not implementations)
- Used by: Web layer (routers)
- Pattern: Each use case receives repositories/services via constructor injection, implements single `execute()` method
- Examples: `CreateMemberUseCase`, `InitiateRedsysPaymentUseCase`, `ProcessRedsysWebhookUseCase`

**Infrastructure Layer (`src/infrastructure/`):**
- Purpose: Concrete implementations and framework integrations
- Location: `src/infrastructure/adapters/repositories/`, `src/infrastructure/web/`, `src/infrastructure/adapters/services/`
- Contains:
  - **Repositories** (`adapters/repositories/mongodb_*.py`): MongoDB implementations of port interfaces
  - **Web** (`web/routers/`, `web/dto/`, `web/mappers_*.py`, `web/dependencies.py`): FastAPI routers, DTOs (Pydantic), mappers between DTOs and domain entities, dependency injection
  - **Services** (`adapters/services/`): Email, PDF, Redsys payment, license image generation
  - **Scheduler** (`scheduler/`): Background jobs for notifications
- Depends on: Application layer (use cases, ports), Domain layer (entities), external libraries (FastAPI, Motor, Pydantic)
- Used by: FastAPI application, external systems (webhooks)

### Frontend Layers

**Feature Layer (`src/features/{feature}/`):**
- Purpose: Self-contained business domain with UI and state management
- Contains: `data/`, `hooks/`, `components/`
- Features: `members`, `licenses`, `seminars`, `payments`, `insurance`, `annual-payments`, `clubs`, `price-configurations`, `invoices`, `member-payments`, `auth`, `password-reset`, `clubs`, `import-export`

**Data Layer (`features/{feature}/data/`):**
- Purpose: API communication and type definitions
- Location: `data/schemas/`, `data/services/`
- Contains:
  - **Schemas** (`*.schema.ts`): Zod type definitions for API requests/responses
  - **Services** (`*service.ts`): Axios API client functions (getMembers, createMember, etc.)
- Pattern: Stateless functions exported as service object (e.g., `memberService.getMembers()`)
- Example: `src/features/members/data/services/member.service.ts` exports functions using `apiClient.get/post/put/delete`

**Hooks Layer (`features/{feature}/hooks/`):**
- Purpose: Feature state management and server synchronization
- Location: `hooks/`, `hooks/queries/`, `hooks/mutations/`
- Contains:
  - **Context Hook** (`use{Feature}Context.tsx`): React Context provider + custom hook for feature state
  - **Query Hooks** (`queries/use{Feature}Queries.ts`): React Query `useQuery` wrappers for data fetching
  - **Mutation Hooks** (`mutations/use{Feature}Mutations.ts`): React Query `useMutation` wrappers for data modification
- Pattern:
  - Context wraps queries/mutations and exposes feature API (create, update, delete, select, etc.)
  - Queries return `{ data, isLoading, isFetching, error }`
  - Mutations return `{ mutate, isPending, error, isSuccess }`
  - Stale time: 2-5 minutes for most queries
- Example: `useMemberContext()` provides `createMember()`, `updateMember()`, `members`, `filters`, `setPagination()`

**Components Layer (`features/{feature}/components/`):**
- Purpose: React UI components for the feature
- Contains: List views, forms, detail views, dialogs
- Interaction: Components import `use{Feature}Context` for state/operations and UI components from `@/components/ui/`
- Example: `MemberList.tsx` uses `useMemberContext()` to access members and actions

**Core Infrastructure (`src/core/`):**
- Purpose: Shared utilities across features
- Location: `core/data/` (API client, query client), `core/hooks/` (shared hooks)
- Contains:
  - `apiClient.ts`: Axios instance with base URL, auth headers, error handling
  - `queryClient.ts`: React Query client configuration
  - Shared hooks: `usePermissions.ts` (role-based access control)

**UI Components (`src/components/ui/`):**
- Purpose: Reusable UI building blocks
- Based on: Radix UI + TailwindCSS
- Examples: `Button`, `Dialog`, `Input`, `Table`, `Select`, `Popover`, `Badge`

**Pages (`src/pages/`):**
- Purpose: Route handlers that compose feature providers and components
- Pattern: Page wraps components in feature providers (e.g., `MemberProvider`, `ClubProvider`)
- Example: `members.page.tsx` exports `MembersPage` component

## Data Flow

### Backend Data Flow: Create Member Example

```
User Request (POST /api/v1/members)
    ↓
FastAPI Router (members.py:create_member)
    ├─ Parse & validate DTO (MemberCreate via Pydantic)
    ├─ Get AuthContext dependency (authentication + linked member)
    ├─ Check authorization (ctx.is_club_admin, ctx.club_id)
    ├─ Call use case dependency (get_create_member_use_case)
    ↓
Use Case (CreateMemberUseCase.execute)
    ├─ Validate DNI uniqueness (member_repository.find_by_dni)
    ├─ Validate email uniqueness (member_repository.find_by_email)
    ├─ Validate club exists (club_repository.exists)
    ├─ Create Member domain entity
    ↓
Domain Entity (Member.__post_init__)
    ├─ Validate first_name not empty
    ├─ Validate email format (if provided)
    ├─ Set timestamps
    ↓
Repository (MongoDBMemberRepository.create)
    ├─ Convert entity to MongoDB document (_to_document)
    ├─ Insert into MongoDB
    ├─ Fetch created document
    ├─ Convert back to domain entity (_to_domain)
    ↓
Mapper (MemberMapper.to_response_dto)
    └─ Convert entity to response DTO
        ↓
        Return MemberResponse (200 Created)
```

### Frontend Data Flow: Display Members List

```
MembersPage mounts
    ↓
MemberProvider wrapper mounts
    ├─ useState(filters, selectedMember)
    ├─ useMembersQuery(filters) → calls memberService.getMembers(filters)
    ├─ useCreateMemberMutation, useUpdateMemberMutation, etc.
    ↓
useMembersQuery (React Query)
    ├─ Makes API request: GET /api/v1/members?limit=20&offset=0
    ├─ Caches response with key ['members', filters]
    ├─ Sets staleTime: 2 minutes
    ├─ Returns { data: Member[], isLoading, isFetching, error }
    ↓
MemberContext.Provider exposes
    ├─ members: Member[]
    ├─ filters: MemberFilters
    ├─ createMember(data), updateMember(id, data), deleteMember(id)
    ├─ selectMember(member), setFilters(filters), setPagination(offset, limit)
    ↓
MemberList component consumes
    ├─ const { members, isLoading, createMember } = useMemberContext()
    ├─ Renders table of members
    ├─ On create: calls createMember(formData)
    ↓
useCreateMemberMutation
    ├─ Makes POST /api/v1/members with data
    ├─ On success: invalidates ['members'] query cache
    ├─ Re-fetches members list
    └─ Calls onSuccess callback
```

### State Management

**Backend:**
- No persistent state (stateless request-response)
- Domain entities maintain invariants within transaction
- Databases (MongoDB) is source of truth
- Scheduler maintains job queue for background tasks

**Frontend:**
- React Query manages server state (members, licenses, payments) with synchronization
- React Context manages feature UI state (selected item, filters, pagination, loading state)
- Separation: Context coordinates query/mutation hooks; hooks handle caching
- Browser stores auth tokens (localStorage via `@/core/data/appStorage.ts`)

## Key Abstractions

**Repository Port Pattern (Backend):**
- Purpose: Decouple domain from persistence mechanism
- Location: `src/application/ports/`
- Examples: `MemberRepositoryPort`, `LicenseRepositoryPort`, `PaymentRepositoryPort`
- Pattern:
  ```python
  class MemberRepositoryPort(ABC):
      async def find_by_id(self, member_id: str) -> Optional[Member]: ...
      async def create(self, member: Member) -> Member: ...
  ```
- Implementation: `MongoDBMemberRepository` in `src/infrastructure/adapters/repositories/`

**Use Case Class (Backend):**
- Purpose: Orchestrate single business operation
- Pattern:
  ```python
  class CreateMemberUseCase:
      def __init__(self, member_repo: MemberRepositoryPort, club_repo: ClubRepositoryPort):
          self.member_repository = member_repo
          self.club_repository = club_repo

      async def execute(self, first_name: str, ...) -> Member:
          # 1. Validate inputs via repositories
          # 2. Create domain entity
          # 3. Persist via repository
          # 4. Return entity
  ```
- Location: `src/application/use_cases/{domain}/`

**Domain Entity (Backend):**
- Purpose: Model business concepts with invariants
- Pattern: Dataclass with validation in `__post_init__` and business methods
- Examples: `Member.promote_to_admin()`, `License.renew()`, `Payment.process()`
- Location: `src/domain/entities/`

**Feature Context Hook (Frontend):**
- Purpose: Encapsulate feature state and operations
- Pattern:
  ```typescript
  interface FeatureContextType {
    items: Item[];
    selectedItem: Item | null;
    isLoading: boolean;
    createItem: (data: CreateItemRequest) => void;
    updateItem: (id: string, data: UpdateItemRequest) => void;
    // ... more operations
  }

  export const FeatureProvider = ({ children }) => { /* wrap queries/mutations */ };
  export const useFeatureContext = () => useContext(FeatureContext);
  ```
- Location: `src/features/{feature}/hooks/use{Feature}Context.tsx`

**React Query Integration (Frontend):**
- Purpose: Synchronize server state with UI state
- Pattern: Mutations automatically invalidate query cache on success
- Example:
  ```typescript
  const createMutation = useMutation({
    mutationFn: (data) => memberService.createMember(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] })
  });
  ```

**Authorization Context (Backend):**
- Purpose: Encapsulate role-based access logic
- Location: `src/infrastructure/web/authorization.py`
- Contains: `AuthContext` with `user`, `member`, methods like `is_club_admin`, `can_access_club(club_id)`
- Dependency: `get_auth_context()` in `dependencies.py:565`
- Pattern:
  ```python
  async def get_auth_context(
      current_user: User = Depends(get_current_active_user),
      member_repo = Depends(get_member_repository)
  ) -> AuthContext:
      # Load linked member if user has member_id
      return AuthContext(user=current_user, member=member)
  ```
- Usage: Routers inject `ctx: AuthContext = Depends(get_auth_context)` to check permissions

**Role System:**
- Global: `User.global_role` (super_admin | user)
- Club-scoped: `Member.club_role` (admin | member)
- Effective role: super_admin has full access; user+admin role = club_admin
- Routers derive effective_club_id using `get_club_filter_ctx(ctx)` to limit club admins to their club

## Entry Points

**Backend:**
- Location: `src/main.py`
- Creates: `app = create_app()` via factory in `src/app.py`
- Runs: `uvicorn main:app --reload`
- App startup: Initializes routers, exception handlers, CORS, lifespan scheduler

**Frontend:**
- Location: `frontend/src/main.tsx`
- Mounts: React app to DOM root
- App component: `src/App.tsx`
  - Wraps routes in `QueryClientProvider`, `AuthProvider`, `Router`
  - Lazy-loads pages with retry logic for stale deployments
  - Routes: Auth pages (login, register, reset-password), protected routes under `AppLayout`

**Routers (Backend):**
- All routes prefixed `/api/v1` except `/api/health` and `/api/dashboard`
- Included in app via `app.include_router(router, prefix="/api/v1")`
- Routers: `users`, `clubs`, `members`, `licenses`, `seminars`, `payments`, `insurances`, `dashboard`, `import_export`, `price_configurations`, `invoices`, `notifications`, `password_reset`, `member_payments`
- Location: `src/infrastructure/web/routers/`

## Error Handling

**Strategy:** Domain exceptions map to HTTP status codes; FastAPI exception handlers convert exceptions to JSON responses

**Patterns:**

Backend domain exceptions → HTTP responses:
```python
@app.exception_handler(EntityNotFoundError)  # 404
@app.exception_handler(ValidationError)      # 422
@app.exception_handler(BusinessRuleViolationError)  # 409
@app.exception_handler(DomainException)      # 400
```

Router authorization errors:
```python
if ctx.is_club_admin and member_data.club_id != ctx.club_id:
    raise HTTPException(status_code=403, detail="No tienes acceso a este miembro")
```

Frontend error handling:
- Mutations capture `error` state from React Query
- Toast notifications (via `sonner`) display error messages
- Fallback: Generic "Something went wrong" if no specific error

## Cross-Cutting Concerns

**Logging:**
- Backend: Python logging with `logfire` integration (configured in `src/config/logfire.py`)
- Frontend: Browser console via `console.log`

**Validation:**
- Backend: Pydantic models in DTOs validate shape; domain entities validate business rules in `__post_init__`
- Frontend: Zod schemas validate API responses; component forms validate inputs before submission

**Authentication:**
- Backend: OAuth2 with JWT tokens (decoded in `src/infrastructure/web/security.py`)
- Dependency: `get_current_active_user()` in `dependencies.py:552`
- Frontend: Token stored in localStorage; sent via Authorization header (configured in `apiClient`)

**Authorization:**
- Backend: Role-based via `AuthContext` injected into routers
- Pattern: Check `ctx.is_club_admin`, `ctx.is_super_admin`, call `check_club_access_ctx(ctx, club_id)`
- Frontend: `usePermissions()` hook gates UI elements based on user role

**CORS:**
- Configured in `app.py` for local dev (localhost:5173, 5174), production URLs, and mobile (Capacitor)

**Pagination:**
- Backend: Repositories accept `limit` parameter; routers pass `limit` query param
- Frontend: Context maintains `offset`, `limit`; queries send as params; mutations invalidate cache

**Timestamps:**
- Backend: MongoDB stores naive datetimes (UTC)
- Pattern: Use `datetime.utcnow()`, not `datetime.now(timezone.utc)`
- Mapped to domain: `created_at`, `updated_at` on entities

**Payment Integration (Redsys):**
- Backend: `RedsysService` handles transaction signing/verification
- Use cases: `InitiateRedsysPaymentUseCase`, `ProcessRedsysWebhookUseCase` coordinate payment flow
- Webhooks: `/api/v1/payments/redsys/webhook` processes payment notifications

**Notifications:**
- Backend: Scheduler runs async jobs via APScheduler
- Services: Email service sends notifications; PDF service generates invoices
- Location: `src/infrastructure/scheduler/`

---

*Architecture analysis: 2025-02-27*
