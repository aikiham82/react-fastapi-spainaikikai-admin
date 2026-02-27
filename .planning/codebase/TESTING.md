# Testing Patterns

**Analysis Date:** 2026-02-27

## Test Framework

**Backend:**
- **Runner**: pytest 8.3.5
- **Async Support**: pytest-asyncio 0.25.2
- **Coverage**: pytest-cov 6.0.0
- **Config**: `backend/pytest.ini` and `backend/pyproject.toml`

**Frontend:**
- **Runner**: Vitest 3.2.4
- **Config**: `frontend/vitest.config.ts`
- **Environment**: jsdom
- **Coverage**: @vitest/coverage-v8 3.2.4

**Assertion Libraries:**
- **Backend**: pytest assertions (built-in `assert`)
- **Frontend**: @testing-library/react, @testing-library/jest-dom, vitest assertions

**Run Commands:**

**Backend:**
```bash
# Run all tests with coverage
poetry run pytest --cov=src --cov-report=term-missing

# Watch mode (not explicitly configured)
pytest-watch  # or use IDE

# Run specific test types
poetry run pytest -m unit            # Unit tests only
poetry run pytest -m integration     # Integration tests only
poetry run pytest -m "not slow"      # Skip slow tests

# Run specific file
poetry run pytest tests/test_domain_entities.py

# Run tests matching pattern
poetry run pytest -k "test_user"
```

**Frontend:**
```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# UI dashboard
npm run test:ui
```

## Test File Organization

**Location:**

**Backend**: Parallel structure to source
- Source: `backend/src/domain/entities/user.py`
- Tests: `backend/tests/domain/test_user_entity.py`
- Source: `backend/src/infrastructure/web/routers/users.py`
- Tests: `backend/tests/infrastructure/web/test_user_router.py`

**Frontend**: Co-located in `__tests__` directories
- Source: `frontend/src/features/auth/hooks/useAuthContext.tsx`
- Tests: `frontend/src/features/auth/hooks/__tests__/useAuthContext.test.tsx`
- Source: `frontend/src/features/auth/data/auth.service.ts`
- Tests: `frontend/src/features/auth/data/__tests__/auth.service.test.ts`

**Naming:**
- **Backend**: `test_*.py` (pytest discovery pattern)
- **Frontend**: `*.test.tsx`, `*.spec.tsx` in `__tests__` directories

**Test Discovery:**
- **Backend**: pytest finds `test_*.py` in `testpaths = ["tests"]`
- **Frontend**: Vitest finds `src/**/*.{test,spec}.{ts,tsx}`

## Test Structure

**Backend Pattern:**
```python
"""User entity tests."""

import pytest
from datetime import datetime

from src.domain.entities.user import User
from src.domain.exceptions.user import UserNotFoundError


class TestUserEntity:
    """Test cases for User domain entity."""

    @pytest.fixture
    def user_fixture(self):
        """User fixture."""
        return User(
            email="test@example.com",
            username="testuser",
            hashed_password="hashed_password_123",
            is_active=True
        )

    def test_user_creation_valid(self, user_fixture):
        """Test valid user creation."""
        assert user_fixture.email == "test@example.com"
        assert user_fixture.is_active is True

    @pytest.mark.unit
    def test_user_activation(self, user_fixture):
        """Test user activation."""
        user_fixture.deactivate()
        assert user_fixture.is_active is False
```

**Frontend Pattern:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider, useAuthContext } from '../useAuthContext'

describe('useAuthContext', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    // cleanup
  })

  const createWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )

  it('should provide context when used within AuthProvider', () => {
    const { result } = renderHook(() => useAuthContext(), {
      wrapper: createWrapper
    })

    expect(result.current).toMatchObject({
      isAuthenticated: expect.any(Boolean),
      isLoading: expect.any(Boolean),
    })
  })
})
```

**Patterns:**
- **Backend**: Class-based test organization (TestUserEntity, TestMemberRouter)
  - Fixtures provide setup/teardown
  - Methods prefixed with `test_`
  - Markers for test categorization (@pytest.mark.unit, @pytest.mark.integration)

- **Frontend**: describe/it blocks with beforeEach/afterEach hooks
  - Vitest hoisting with `vi.hoisted()` for module mocks
  - Wrapper components for context providers
  - `act()` wrapper for state changes
  - `waitFor()` for async operations

## Mocking

**Framework:**
- **Backend**: unittest.mock (AsyncMock, MagicMock, patch)
- **Frontend**: Vitest (vi.fn(), vi.mock(), vi.hoisted())

**Patterns:**

**Backend Mocking:**
```python
from unittest.mock import AsyncMock, MagicMock, patch

@pytest.fixture
def mock_user_repository():
    """Mock user repository for use case testing."""
    mock_repo = MagicMock()
    mock_repo.find_all = AsyncMock(return_value=[])
    mock_repo.find_by_id = AsyncMock(return_value=None)
    mock_repo.find_by_email = AsyncMock(return_value=None)
    mock_repo.create = AsyncMock()
    mock_repo.update = AsyncMock()
    mock_repo.delete = AsyncMock(return_value=True)
    mock_repo.exists = AsyncMock(return_value=False)
    return mock_repo

def test_create_user_with_mock(mock_user_repository, user_create_data):
    """Test use case with mocked repository."""
    use_case = CreateUserUseCase(mock_user_repository)

    with patch('src.infrastructure.web.routers.users.get_password_hash') as mock_hash:
        mock_hash.return_value = "hashed_password"

        # Test assertion
```

**Frontend Mocking:**
```typescript
// Hoist mocks before module loading
const { mockAppStorage } = vi.hoisted(() => ({
  mockAppStorage: {
    local: {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      getString: vi.fn().mockReturnValue(null),
    }
  }
}))

// Mock external modules
vi.mock('@/core/data/appStorage', () => ({
  appStorage: () => mockAppStorage
}))

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn()
}))

// In tests
const mockJwtDecode = vi.mocked(jwtDecode)
mockJwtDecode.mockReturnValue({
  sub: 'test@example.com',
  exp: Math.floor(Date.now() / 1000) + 3600
})
```

**What to Mock:**
- External HTTP APIs (services)
- Storage (localStorage, sessionStorage)
- Third-party libraries (jwt-decode, sonner)
- UI libraries (Radix UI interactions)
- Navigation
- DOM APIs (ResizeObserver, IntersectionObserver, matchMedia)

**What NOT to Mock:**
- Domain entities (use real instances or factories)
- Business logic (test actual behavior)
- React hooks in React Testing Library (render with provider wrapper)
- Type definitions and schemas

## Fixtures and Factories

**Test Data:**

**Backend Fixtures (conftest.py):**
```python
@pytest.fixture
def valid_user_data():
    """Valid user data for testing."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "hashed_password": "hashed_password_123"
    }

@pytest.fixture
def user_entity():
    """User entity instance for testing."""
    from src.domain.entities.user import User
    return User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed_password_123",
        is_active=True
    )

@pytest.fixture
def mock_database():
    """Mock MongoDB database for testing."""
    from unittest.mock import AsyncMock, MagicMock
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_collection.find_one = AsyncMock(return_value=None)
    mock_collection.insert_one = AsyncMock()
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)
    return mock_db
```

**Frontend Factories (src/test-utils/factories.ts):**
```typescript
export function createMockJWT({ sub, exp }: { sub?: string, exp?: number }) {
  // Returns mock JWT string
}

export function createMockAuthResponse({ access_token }: { access_token: string }) {
  return {
    access_token,
    token_type: 'bearer'
  }
}

export function createMockLocalStorageState() {
  return {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
}
```

**Location:**
- **Backend**: `backend/tests/conftest.py` (shared fixtures)
- **Frontend**: `frontend/src/test-utils/` directory with factories

## Coverage

**Requirements:**
- **Backend**: 80% minimum threshold (`--cov-fail-under=80` in pyproject.toml)
- **Frontend**: 80% global + per-feature thresholds in `vitest.config.ts`

**Exclusions:**

**Backend:**
```ini
# pyproject.toml coverage.report
exclude_lines =
    pragma: no cover
    def __repr__
    if self.debug:
    if settings.DEBUG
    raise AssertionError
    raise NotImplementedError
    if 0:
    if __name__ == .__main__.:
    if TYPE_CHECKING:
    class .*\bProtocol\):
    @(abc\.)?abstractmethod
```

**Frontend:**
```typescript
// vitest.config.ts
exclude: [
  'node_modules/',
  'dist/',
  'src/main.tsx',
  'src/vite-env.d.ts',
  'src/test-utils/',
  '**/*.d.ts',
  '**/*.test.{ts,tsx}',
  '**/*.spec.{ts,tsx}',
  '**/index.{ts,tsx}'
]
```

**View Coverage:**

**Backend:**
```bash
# Generate coverage report
poetry run pytest --cov=src --cov-report=html
# Open htmlcov/index.html
```

**Frontend:**
```bash
npm run test:coverage
# Open coverage/index.html
```

## Test Types

**Unit Tests:**
- **Backend**: Domain entities, use cases, DTOs, mappers
  - Test single class/function in isolation
  - Mock all external dependencies
  - Marked with `@pytest.mark.unit`
  - Example: `test_member_entity.py` tests Member entity validation

- **Frontend**: Hooks, services, utilities in isolation
  - Mock API calls, storage, third-party libs
  - Use factories for test data
  - Example: `useAuthContext.test.tsx` tests hook logic with mocked dependencies

**Integration Tests:**
- **Backend**: Repository + use case integration
  - Test database operations with real or in-memory database
  - Verify complex workflows
  - Marked with `@pytest.mark.integration`
  - Example: test user creation through use case → repository → database

- **Frontend**: Component + hook integration
  - Render with providers (QueryClientProvider, AuthProvider)
  - Test user interactions
  - Example: `LoginForm.test.tsx` tests form submission with mocked mutations

**E2E Tests:**
- **Frontend**: Not implemented in this codebase
- **Backend**: Not implemented (would use TestClient with full app setup)

## Common Patterns

**Async Testing:**

**Backend:**
```python
@pytest.mark.asyncio
async def test_async_operation():
    """Test async function."""
    result = await async_use_case.execute()
    assert result is not None

# Or use pytest-asyncio auto mode (configured in pytest.ini)
async def test_with_auto_mode(member_repository):
    """Auto-detected async test."""
    result = await member_repository.find_by_id("123")
    assert result is None
```

**Frontend:**
```typescript
it('should handle async login', async () => {
  const mockLoginMutation = vi.fn()
  mockUseLoginMutation.mockReturnValue({
    login: mockLoginMutation,
    isLoading: false,
    error: null
  })

  const { result } = renderHook(() => useAuthContext(), {
    wrapper: createWrapper
  })

  await act(async () => {
    await result.current.login(mockCredentials)
  })

  expect(mockLoginMutation).toHaveBeenCalled()
})
```

**Error Testing:**

**Backend:**
```python
def test_member_creation_invalid_email_raises_error(self):
    """Test member creation with invalid email raises error."""
    with pytest.raises(ValueError, match="Invalid email format"):
        Member(
            email="invalid-email",
            # ... other valid fields
        )

def test_register_with_existing_email_returns_400(self, test_app, user_create_data):
    """Test registration with existing email returns 400."""
    mock_use_case = AsyncMock()
    mock_use_case.execute.side_effect = UserAlreadyExistsError("User already exists")

    test_app.dependency_overrides[get_create_user_use_case] = lambda: mock_use_case
    client = TestClient(test_app)

    response = client.post("/api/v1/auth/register", json=user_create_data)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
```

**Frontend:**
```typescript
it('should display toast for login errors', async () => {
  const loginError = new Error('Invalid credentials')

  mockUseLoginMutation.mockReturnValue({
    login: vi.fn(),
    isLoading: false,
    error: loginError
  })

  renderHook(() => useAuthContext(), {
    wrapper: createWrapper
  })

  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith('An error occurred during register')
  })
})
```

## Test Markers (Backend)

**Available Markers:**
```ini
# pytest.ini
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    unit: marks tests as unit tests
    auth: marks tests related to authentication
    api: marks tests related to API endpoints
    service: marks tests related to service layer
    repository: marks tests related to repository layer
    domain: marks tests related to domain entities
```

**Usage:**
```python
@pytest.mark.unit
@pytest.mark.api
class TestRegisterEndpoint:
    """Test suite for user registration endpoint."""

    def test_register_with_valid_data_returns_token(self):
        ...

@pytest.mark.integration
@pytest.mark.slow
def test_full_user_creation_flow():
    ...
```

## Test Configuration

**Backend (pytest.ini):**
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --strict-markers
asyncio_mode = auto
asyncio_default_fixture_loop_scope = function
```

**Frontend (vitest.config.ts):**
```typescript
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test-utils/setup.ts'],
  globals: true,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    thresholds: {
      global: { lines: 80, functions: 80, branches: 80, statements: 80 },
      'src/features/auth/': { lines: 80, functions: 80, branches: 80, statements: 80 },
      'src/core/': { lines: 80, functions: 80, branches: 80, statements: 80 }
    }
  },
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true
}
```

## Test Setup Files

**Backend (conftest.py):**
- Repository fixtures for all entities (club, member, license, seminar, payment, insurance)
- User entity fixtures (user_entity, user_entity_with_id, test_users_list)
- Mock database and collection fixtures
- DTO test data fixtures (user_create_data, user_login_data, user_response_data)
- Scope: function (tests run in isolation)

**Frontend (src/test-utils/setup.ts):**
- localStorage/sessionStorage mocks
- window.matchMedia mock
- ResizeObserver mock
- IntersectionObserver mock
- jwt-decode mock
- sonner (toast) mock
- Suppress console.error for cleaner output
- beforeEach: clear mocks and storage

---

*Testing analysis: 2026-02-27*
