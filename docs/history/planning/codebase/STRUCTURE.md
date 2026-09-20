# Codebase Structure

**Analysis Date:** 2025-02-27

## Directory Layout

```
react-fastapi-spainaikikai-admin/
├── backend/
│   ├── src/
│   │   ├── main.py                          # Entry point, uvicorn runner
│   │   ├── app.py                           # FastAPI app factory, routers, exception handlers
│   │   ├── domain/                          # Business rules, no framework dependencies
│   │   │   ├── entities/                    # Dataclass domain objects (Member, License, Payment, etc.)
│   │   │   │   ├── member.py                # Member entity with role system
│   │   │   │   ├── license.py               # License with technical_grade, instructor_category
│   │   │   │   ├── payment.py               # Payment with status tracking
│   │   │   │   ├── insurance.py             # Insurance with accident/civil_liability types
│   │   │   │   ├── seminar.py               # Seminar with date/time
│   │   │   │   ├── club.py                  # Club with name/description
│   │   │   │   ├── invoice.py               # Invoice from payments
│   │   │   │   ├── user.py                  # User with global role
│   │   │   │   ├── price_configuration.py   # Price rules
│   │   │   │   └── member_payment.py        # MemberPayment status tracking
│   │   │   └── exceptions/                  # Domain-specific exceptions
│   │   │       ├── base.py                  # EntityNotFoundError, ValidationError, BusinessRuleViolationError
│   │   │       ├── member.py                # MemberAlreadyExistsError, InvalidClubForMemberError
│   │   │       └── [domain]_*.py            # Domain-specific exceptions
│   │   ├── application/                     # Business logic orchestration
│   │   │   ├── ports/                       # Repository/service interfaces (contracts)
│   │   │   │   ├── __init__.py              # Exports all ports
│   │   │   │   ├── member_repository.py     # MemberRepositoryPort (find_all, create, update, delete, etc.)
│   │   │   │   ├── club_repository.py       # ClubRepositoryPort
│   │   │   │   ├── license_repository.py    # LicenseRepositoryPort
│   │   │   │   ├── payment_repository.py    # PaymentRepositoryPort
│   │   │   │   ├── email_service.py         # EmailServicePort
│   │   │   │   ├── pdf_service.py           # PDFServicePort
│   │   │   │   ├── redsys_service.py        # RedsysServicePort for payment processing
│   │   │   │   └── [domain]_repository.py   # Other repository ports
│   │   │   └── use_cases/                   # Single-responsibility business operations
│   │   │       ├── member/
│   │   │       │   ├── create_member_use_case.py          # Validates DNI/email uniqueness, creates Member
│   │   │       │   ├── get_all_members_use_case.py        # Fetch members, optionally filtered by club
│   │   │       │   ├── search_members_use_case.py         # Search by name with regex
│   │   │       │   ├── get_member_use_case.py
│   │   │       │   ├── update_member_use_case.py
│   │   │       │   ├── delete_member_use_case.py
│   │   │       │   └── change_member_status_use_case.py
│   │   │       ├── payment/
│   │   │       │   ├── create_payment_use_case.py
│   │   │       │   ├── initiate_redsys_payment_use_case.py       # Coordinates Redsys payment
│   │   │       │   ├── process_redsys_webhook_use_case.py        # Handles Redsys webhook
│   │   │       │   ├── initiate_annual_payment_use_case.py       # Multi-member payment batch
│   │   │       │   ├── prefill_annual_payment_use_case.py        # Prepopulates payment data
│   │   │       │   └── [other]_use_case.py
│   │   │       ├── license/                 # License creation, renewal, expiry tracking
│   │   │       ├── seminar/                 # Seminar management
│   │   │       ├── insurance/               # Insurance management
│   │   │       ├── club/                    # Club CRUD
│   │   │       ├── invoice/                 # Invoice generation/download
│   │   │       ├── price_configuration/     # Price rule management
│   │   │       ├── member_payment/          # Member payment status and history
│   │   │       ├── notification/            # Notification sending
│   │   │       └── password_reset/          # Password reset flow
│   │   ├── infrastructure/                  # Framework integrations and implementations
│   │   │   ├── database.py                  # Motor async MongoDB client
│   │   │   ├── adapters/
│   │   │   │   ├── repositories/            # MongoDB implementations of repository ports
│   │   │   │   │   ├── mongodb_member_repository.py      # Implements MemberRepositoryPort
│   │   │   │   │   ├── mongodb_club_repository.py
│   │   │   │   │   ├── mongodb_license_repository.py
│   │   │   │   │   ├── mongodb_payment_repository.py
│   │   │   │   │   ├── mongodb_insurance_repository.py
│   │   │   │   │   ├── mongodb_invoice_repository.py
│   │   │   │   │   ├── mongodb_seminar_repository.py
│   │   │   │   │   ├── mongodb_price_configuration_repository.py
│   │   │   │   │   ├── mongodb_member_payment_repository.py
│   │   │   │   │   ├── mongodb_user_repository.py
│   │   │   │   │   └── mongodb_password_reset_token_repository.py
│   │   │   │   └── services/                # External service implementations
│   │   │   │       ├── email_service.py     # SMTP email sending
│   │   │   │       ├── pdf_service.py       # Invoice PDF generation
│   │   │   │       ├── redsys_service.py    # Redsys payment gateway integration
│   │   │   │       └── license_image_service.py  # License image generation
│   │   │   ├── web/                         # FastAPI web layer
│   │   │   │   ├── routers/                 # API endpoint handlers
│   │   │   │   │   ├── users.py             # Auth login, register, /users/me
│   │   │   │   │   ├── members.py           # /members CRUD with enrichment (licenses, insurance, club names)
│   │   │   │   │   ├── clubs.py             # /clubs CRUD
│   │   │   │   │   ├── licenses.py          # /licenses CRUD, renewal, expiry tracking
│   │   │   │   │   ├── payments.py          # /payments CRUD, annual payment initiation
│   │   │   │   │   ├── seminars.py          # /seminars CRUD
│   │   │   │   │   ├── insurances.py        # /insurances CRUD
│   │   │   │   │   ├── invoices.py          # /invoices fetch, download PDF
│   │   │   │   │   ├── price_configurations.py  # /price-configurations CRUD
│   │   │   │   │   ├── member_payments.py   # /member-payments status/history
│   │   │   │   │   ├── import_export.py     # /import-export data import/export
│   │   │   │   │   ├── notifications.py     # /notifications email/SMS
│   │   │   │   │   ├── dashboard.py         # /dashboard summary stats
│   │   │   │   │   ├── password_reset.py    # /password-reset flow
│   │   │   │   │   └── [domain]_routers.py
│   │   │   │   ├── dto/                     # Pydantic request/response models
│   │   │   │   │   ├── member_dto.py        # MemberCreate, MemberUpdate, MemberResponse with enrichment
│   │   │   │   │   ├── payment_dto.py       # PaymentCreate, PaymentResponse, RedsysWebhook
│   │   │   │   │   ├── license_dto.py
│   │   │   │   │   ├── insurance_dto.py
│   │   │   │   │   ├── club_dto.py
│   │   │   │   │   ├── seminar_dto.py
│   │   │   │   │   ├── invoice_dto.py
│   │   │   │   │   ├── user_dto.py          # UserCreate, UserResponse, TokenData
│   │   │   │   │   └── [domain]_dto.py
│   │   │   │   ├── mappers/                 # Convert between DTOs and domain entities
│   │   │   │   │   ├── mappers_member.py    # MemberMapper.to_response_dto, to_domain
│   │   │   │   │   ├── mappers_payment.py
│   │   │   │   │   ├── mappers_license.py
│   │   │   │   │   └── mappers_*.py
│   │   │   │   ├── dependencies.py          # Dependency injection with @lru_cache()
│   │   │   │   │   └── Creates use case instances, repositories, auth context
│   │   │   │   ├── security.py              # JWT token encode/decode, password hashing
│   │   │   │   ├── authorization.py         # AuthContext, role checking (is_club_admin, etc.)
│   │   │   │   └── assets/                  # Static files (logo, etc.)
│   │   │   ├── scheduler/                   # Background job scheduling (APScheduler)
│   │   │   │   ├── __init__.py              # create_notification_scheduler()
│   │   │   │   └── notification_jobs.py     # Job definitions (send emails, reminders)
│   │   │   └── config/                      # Configuration management
│   │   │       ├── settings.py              # AppSettings from env vars
│   │   │       └── logfire.py               # Logfire observability setup
│   │   └── __init__.py
│   ├── tests/                               # Test suite (pytest)
│   │   ├── domain/                          # Domain entity tests
│   │   ├── infrastructure/adapters/         # Repository implementation tests
│   │   └── infrastructure/web/              # Router/API tests
│   ├── pyproject.toml                       # Python dependencies, Poetry config
│   ├── pytest.ini                           # Test configuration
│   └── poetry.lock                          # Locked dependencies
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                         # React root, render to DOM
│   │   ├── App.tsx                          # Router setup, lazy page loading, providers
│   │   ├── pages/                           # Route-level components (one per page)
│   │   │   ├── login.page.tsx               # Login form, redirects to home on auth
│   │   │   ├── register.page.tsx            # Registration form
│   │   │   ├── forgot-password.page.tsx     # Password reset request
│   │   │   ├── reset-password.page.tsx      # Password reset with token
│   │   │   ├── members.page.tsx             # Wraps MemberProvider + MemberList
│   │   │   ├── clubs.page.tsx               # Club management
│   │   │   ├── licenses.page.tsx            # License management
│   │   │   ├── seminars.page.tsx            # Seminar management
│   │   │   ├── insurance.page.tsx           # Insurance management
│   │   │   ├── annual-payments.page.tsx     # Multi-member payment batch UI
│   │   │   ├── club-payments.page.tsx       # Club-specific payment summary
│   │   │   ├── invoices.page.tsx            # Invoice list/download
│   │   │   ├── price-configurations.page.tsx
│   │   │   ├── import-export.page.tsx
│   │   │   ├── payment-success.page.tsx     # Redsys callback success
│   │   │   ├── payment-failure.page.tsx     # Redsys callback failure
│   │   │   ├── home.page.tsx                # Dashboard
│   │   │   ├── settings.page.tsx            # App settings
│   │   │   └── unauthorized.page.tsx        # 403 error page
│   │   ├── features/                        # Feature-scoped state and components
│   │   │   ├── auth/                        # Authentication feature
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useAuthContext.tsx   # Auth state provider (currentUser, login, logout)
│   │   │   │   │   └── mutations/
│   │   │   │   │       ├── useLoginMutation.ts
│   │   │   │   │       ├── useRegisterMutation.ts
│   │   │   │   │       └── useLogoutMutation.ts
│   │   │   │   └── data/
│   │   │   │       ├── schemas/
│   │   │   │       │   └── auth.schema.ts
│   │   │   │       └── services/
│   │   │   │           └── auth.service.ts  # login, register, logout, getMe
│   │   │   ├── members/                     # Members feature (main domain)
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useMemberContext.tsx # State provider wrapping queries/mutations
│   │   │   │   │   ├── queries/
│   │   │   │   │   │   └── useMemberQueries.ts  # useMembersQuery, useMemberQuery
│   │   │   │   │   └── mutations/
│   │   │   │   │       └── useMemberMutations.ts # useCreateMemberMutation, etc.
│   │   │   │   ├── components/
│   │   │   │   │   ├── MemberList.tsx       # Table view with filters/search/pagination
│   │   │   │   │   ├── MemberForm.tsx       # Create/edit form
│   │   │   │   │   └── MemberBadges.tsx     # Status/role badge components
│   │   │   │   └── data/
│   │   │   │       ├── schemas/
│   │   │   │       │   └── member.schema.ts # Zod Member, CreateMemberRequest, etc.
│   │   │   │       ├── services/
│   │   │   │       │   └── member.service.ts # getMembers, getMember, createMember, updateMember, deleteMember
│   │   │   │       └── utils/
│   │   │   │           └── member-badges.ts # Badge display logic
│   │   │   ├── clubs/                       # Clubs feature
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useClubContext.tsx
│   │   │   │   │   ├── queries/
│   │   │   │   │   └── mutations/
│   │   │   │   ├── components/
│   │   │   │   └── data/
│   │   │   ├── licenses/                    # Licenses feature
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useLicenseContext.tsx
│   │   │   │   │   ├── queries/
│   │   │   │   │   └── mutations/
│   │   │   │   ├── components/
│   │   │   │   └── data/
│   │   │   ├── seminars/                    # Seminars feature
│   │   │   ├── insurance/                   # Insurance feature
│   │   │   ├── payments/                    # Payments feature
│   │   │   ├── annual-payments/             # Annual payment batch feature
│   │   │   ├── member-payments/             # Member payment status feature
│   │   │   ├── invoices/                    # Invoices feature
│   │   │   ├── price-configurations/        # Price configuration feature
│   │   │   ├── import-export/               # Import/export feature
│   │   │   ├── password-reset/              # Password reset feature
│   │   │   └── [feature]/
│   │   │       ├── hooks/                   # Feature state management
│   │   │       │   ├── use{Feature}Context.tsx    # Provider + custom hook
│   │   │       │   ├── queries/use{Feature}Queries.ts  # React Query wrappers
│   │   │       │   └── mutations/use{Feature}Mutations.ts
│   │   │       ├── components/              # Feature UI components
│   │   │       │   ├── {Feature}List.tsx
│   │   │       │   ├── {Feature}Form.tsx
│   │   │       │   └── {Feature}*.tsx
│   │   │       └── data/
│   │   │           ├── schemas/             # Zod type definitions
│   │   │           │   └── {feature}.schema.ts
│   │   │           ├── services/            # API client functions
│   │   │           │   └── {feature}.service.ts
│   │   │           └── utils/               # Feature utilities
│   │   ├── core/                            # Shared infrastructure
│   │   │   ├── data/
│   │   │   │   ├── apiClient.ts             # Axios instance with base URL, auth headers, error handling
│   │   │   │   ├── queryClient.ts           # React Query client configuration
│   │   │   │   └── appStorage.ts            # localStorage wrapper for tokens
│   │   │   └── hooks/
│   │   │       ├── usePermissions.ts        # Role-based access control (canAccess, filteredNavItems)
│   │   │       └── [other].ts
│   │   ├── components/
│   │   │   ├── ui/                          # Radix UI + TailwindCSS components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── popover.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── form.tsx
│   │   │   │   ├── pagination.tsx
│   │   │   │   └── [component].tsx
│   │   │   ├── AppLayout.tsx                # Main layout with sidebar, header, protected routes
│   │   │   ├── Sidebar.tsx                  # Navigation sidebar
│   │   │   ├── Header.tsx                   # Top header with user menu
│   │   │   └── [component].tsx
│   │   ├── lib/
│   │   │   └── utils.ts                     # Utility functions (cn for classnames)
│   │   ├── assets/                          # Static images, logos
│   │   ├── index.css                        # Global TailwindCSS styles
│   │   └── App.css                          # App-level styles
│   ├── package.json                         # Node dependencies, scripts (dev, build, lint, preview)
│   ├── package-lock.json                    # Locked dependencies
│   ├── tsconfig.json                        # TypeScript configuration
│   ├── vite.config.ts                       # Vite bundler configuration
│   ├── tailwind.config.ts                   # TailwindCSS configuration
│   └── .eslintrc.json                       # ESLint configuration
│
├── .planning/
│   └── codebase/                            # Architecture documentation
│       ├── ARCHITECTURE.md                  # This file
│       ├── STRUCTURE.md                     # Directory and file organization
│       ├── STACK.md                         # Tech stack and dependencies
│       ├── INTEGRATIONS.md                  # External APIs and services
│       ├── CONVENTIONS.md                   # Code style and patterns
│       ├── TESTING.md                       # Test organization and patterns
│       └── CONCERNS.md                      # Technical debt and issues
│
├── docker-compose.yml                       # MongoDB + optionally other services
├── CLAUDE.md                                # Project instructions for Claude
└── README.md                                # Project overview
```

## Directory Purposes

**`backend/src/domain/`:**
- Purpose: Pure business logic isolated from frameworks
- Contains: Entity dataclasses, domain exceptions
- Key files: `entities/*.py`, `exceptions/*.py`
- Committed: Yes

**`backend/src/application/`:**
- Purpose: Business logic orchestration without persistence details
- Contains: Use case classes (single execute method), repository port interfaces
- Key files: `use_cases/{domain}/*.py`, `ports/*.py`
- Committed: Yes

**`backend/src/infrastructure/`:**
- Purpose: Framework integrations and external system adapters
- Contains: MongoDB repositories, FastAPI routers, DTOs, services, dependency injection
- Key files: `adapters/repositories/*.py`, `web/routers/*.py`, `web/dependencies.py`
- Committed: Yes

**`frontend/src/features/{feature}/`:**
- Purpose: Self-contained business feature with UI and state
- Contains: Hooks (context, queries, mutations), components, data (schemas, services)
- Key files: `hooks/use{Feature}Context.tsx`, `hooks/queries/`, `hooks/mutations/`, `components/`, `data/`
- Committed: Yes

**`frontend/src/core/`:**
- Purpose: Shared utilities across features
- Contains: API client, React Query client, shared hooks
- Key files: `data/apiClient.ts`, `data/queryClient.ts`, `hooks/usePermissions.ts`
- Committed: Yes

**`frontend/src/components/ui/`:**
- Purpose: Reusable UI building blocks (Radix UI + TailwindCSS)
- Contains: Button, Dialog, Input, Table, Select, Popover, Badge, etc.
- Committed: Yes

**`backend/tests/`:**
- Purpose: Pytest test suite
- Structure: Mirrors `src/` layout (domain, infrastructure, integration)
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: Architecture documentation for Claude development tasks
- Contains: ARCHITECTURE.md, STRUCTURE.md, STACK.md, etc.
- Generated: Yes (by gsd:map-codebase)
- Committed: Yes

## Key File Locations

**Entry Points:**
- Backend: `backend/src/main.py` (uvicorn runner)
- Backend App Factory: `backend/src/app.py` (FastAPI application factory with routers, exception handlers, CORS)
- Frontend: `frontend/src/main.tsx` (React root)
- Frontend App: `frontend/src/App.tsx` (Router, providers, lazy page loading)

**Configuration:**
- Backend Settings: `backend/src/config/settings.py` (AppSettings from env vars)
- Frontend Vite: `frontend/vite.config.ts`
- Frontend TailwindCSS: `frontend/tailwind.config.ts`
- Backend Tests: `backend/pytest.ini`

**Core Logic:**
- Domain Entities: `backend/src/domain/entities/*.py`
- Use Cases: `backend/src/application/use_cases/{domain}/*.py`
- Repositories (MongoDB): `backend/src/infrastructure/adapters/repositories/*.py`
- API Routers: `backend/src/infrastructure/web/routers/*.py`
- Feature Hooks: `frontend/src/features/{feature}/hooks/use{Feature}Context.tsx`
- Feature Services: `frontend/src/features/{feature}/data/services/{feature}.service.ts`

**Testing:**
- Backend Unit Tests: `backend/tests/domain/`
- Backend Repo Tests: `backend/tests/infrastructure/adapters/repositories/`
- Backend API Tests: `backend/tests/infrastructure/web/`

## Naming Conventions

**Files:**
- Backend use cases: `{verb}_{entity}_use_case.py` (e.g., `create_member_use_case.py`, `get_all_members_use_case.py`)
- Backend repositories: `mongodb_{entity}_repository.py` (e.g., `mongodb_member_repository.py`)
- Backend routers: `{entity}.py` (e.g., `members.py`, `payments.py`)
- Backend DTOs: `{entity}_dto.py` (e.g., `member_dto.py`)
- Backend mappers: `mappers_{entity}.py` (e.g., `mappers_member.py`)
- Frontend pages: `{entity}.page.tsx` (e.g., `members.page.tsx`)
- Frontend features: kebab-case folders (e.g., `member-payments`, `price-configurations`)
- Frontend hooks: `use{Feature}Context.tsx`, `use{Feature}Queries.ts`, `use{Feature}Mutations.ts`
- Frontend services: `{entity}.service.ts` (e.g., `member.service.ts`)
- Frontend schemas: `{entity}.schema.ts` (e.g., `member.schema.ts`)

**Directories:**
- Backend domain entities: `domain/entities/`
- Backend use cases by domain: `application/use_cases/{domain}/`
- Backend repositories: `infrastructure/adapters/repositories/`
- Frontend features by domain: `features/{domain}/`
- Frontend shared components: `components/ui/`

**Functions:**
- Backend: snake_case (e.g., `find_by_club_id`, `create_member`)
- Frontend: camelCase (e.g., `getMember`, `createMember`)

**Classes:**
- Backend: PascalCase (e.g., `CreateMemberUseCase`, `MongoDBMemberRepository`)
- Frontend: PascalCase (e.g., `MemberProvider`, `MemberList`)

**React Components:**
- PascalCase with `.tsx` extension (e.g., `MemberList.tsx`, `MemberForm.tsx`)

**Types/Interfaces:**
- Backend: Domain entities are dataclass (e.g., `Member`), ports are ABC (e.g., `MemberRepositoryPort`)
- Frontend: Zod schemas (e.g., `member.schema.ts`), TypeScript interfaces in hooks/components

## Where to Add New Code

**New Backend Feature:**
1. Create entity: `backend/src/domain/entities/{feature}.py`
2. Create exceptions: `backend/src/domain/exceptions/{feature}.py`
3. Create port: `backend/src/application/ports/{feature}_repository.py`
4. Create use cases: `backend/src/application/use_cases/{feature}/*.py` (one per operation)
5. Create MongoDB adapter: `backend/src/infrastructure/adapters/repositories/mongodb_{feature}_repository.py`
6. Create DTOs: `backend/src/infrastructure/web/dto/{feature}_dto.py`
7. Create mapper: `backend/src/infrastructure/web/mappers_{feature}.py`
8. Create router: `backend/src/infrastructure/web/routers/{feature}.py`
9. Register use cases in: `backend/src/infrastructure/web/dependencies.py` (with @lru_cache)
10. Include router in: `backend/src/app.py` (app.include_router)
11. Add tests: `backend/tests/` (mirror the structure)

**New Frontend Feature:**
1. Create feature directory: `frontend/src/features/{feature-name}/`
2. Create data layer:
   - `data/schemas/{feature}.schema.ts` (Zod definitions)
   - `data/services/{feature}.service.ts` (API client functions)
3. Create hooks:
   - `hooks/use{Feature}Context.tsx` (React Context provider + custom hook)
   - `hooks/queries/use{Feature}Queries.ts` (React Query useQuery wrappers)
   - `hooks/mutations/use{Feature}Mutations.ts` (React Query useMutation wrappers)
4. Create components:
   - `components/{Feature}List.tsx` (table/list view)
   - `components/{Feature}Form.tsx` (create/edit form)
   - `components/{Feature}*.tsx` (other components)
5. Create page: `frontend/src/pages/{feature}.page.tsx` (wraps provider + component)
6. Register route in: `frontend/src/App.tsx` (add Route in Routes)

**New Shared Utility:**
- Backend: `backend/src/infrastructure/` or `backend/src/application/`
- Frontend: `frontend/src/core/hooks/` or `frontend/src/lib/`

**New UI Component:**
- Location: `frontend/src/components/ui/{component-name}.tsx`
- Base: Radix UI primitive + TailwindCSS classes
- Export from: `frontend/src/components/ui/` as named export

## Special Directories

**`backend/.venv/`:**
- Purpose: Python virtual environment
- Generated: Yes (poetry install)
- Committed: No

**`backend/__pycache__/` and `**/__pycache__/`:**
- Purpose: Python bytecode cache
- Generated: Yes (Python runtime)
- Committed: No

**`frontend/node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes (npm install)
- Committed: No

**`frontend/dist/`:**
- Purpose: Production build output
- Generated: Yes (npm run build)
- Committed: No

**`.env` and `.env.local`:**
- Purpose: Local environment variables (secrets, API keys)
- Generated: Manually created
- Committed: No (listed in .gitignore)
- Contains: MONGODB_URI, SMTP_PASSWORD, REDSYS_MERCHANT_CODE, etc.

**`backend/htmlcov/`:**
- Purpose: Test coverage report
- Generated: Yes (pytest --cov --cov-report=html)
- Committed: No

---

*Structure analysis: 2025-02-27*
