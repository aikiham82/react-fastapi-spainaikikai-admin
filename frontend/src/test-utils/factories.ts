import { vi } from 'vitest'
import type { 
  AuthRequest, 
  AuthResponse, 
  CurrentUser, 
  AuthUser,
  RegisterRequest 
} from '@/features/auth/data/auth.schema'

// Factory for creating test auth requests
export const createMockAuthRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest => ({
  email: 'test@example.com',
  password: 'password123',
  ...overrides,
})

// Factory for creating test register requests
export const createMockRegisterRequest = (overrides: Partial<RegisterRequest> = {}): RegisterRequest => ({
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  ...overrides,
})

// Factory for creating test auth responses
export const createMockAuthResponse = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
  access_token: 'mock.jwt.token',
  token_type: 'bearer',
  ...overrides,
})

// Factory for creating test current users
export const createMockCurrentUser = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  is_active: true,
  global_role: 'user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

// Factory for creating test auth users
export const createMockAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  email: 'test@example.com',
  ...overrides,
})

// JWT Token factories
export const createMockJWT = (payload: Record<string, any> = {}) => {
  const defaultPayload = {
    sub: 'test@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    ...payload,
  }
  
  // This is a mock JWT - in real tests, jwt-decode is mocked
  return `mock.${btoa(JSON.stringify(defaultPayload))}.token`
}

// Factory for expired JWT tokens
export const createExpiredMockJWT = (payload: Record<string, any> = {}) => {
  return createMockJWT({
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
    ...payload,
  })
}

// Local storage state factories
export const createMockLocalStorageState = (overrides: Record<string, string> = {}) => ({
  access_token: 'mock.jwt.token',
  refresh_token: 'mock.refresh.token',
  user_email: 'test@example.com',
  session_expiration: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  ...overrides,
})

// Factory for creating test users in different states
export const createMockUserStates = {
  authenticated: () => createMockCurrentUser({ is_active: true }),
  inactive: () => createMockCurrentUser({ is_active: false }),
  new: () => createMockCurrentUser({ 
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString() 
  }),
}

// API Response factories
export const createMockApiResponse = <T>(data: T, overrides: any = {}) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
  ...overrides,
})

export const createMockApiError = (message = 'API Error', status = 500, overrides: any = {}) => ({
  response: {
    data: { message },
    status,
    statusText: status === 400 ? 'Bad Request' : 'Internal Server Error',
    headers: {},
    config: {},
  },
  message,
  ...overrides,
})

// React Query factories
export const createMockQueryResult = <T>(data: T, overrides: any = {}) => ({
  data,
  isLoading: false,
  isError: false,
  isSuccess: true,
  error: null,
  refetch: vi.fn(),
  ...overrides,
})

export const createMockMutationResult = <T = any>(overrides: any = {}) => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isLoading: false,
  isError: false,
  isSuccess: false,
  error: null,
  data: undefined as T,
  reset: vi.fn(),
  ...overrides,
})

// Date factories for consistent test dates
export const createMockDates = {
  now: () => new Date('2024-01-01T12:00:00Z'),
  future: (hours = 1) => new Date(Date.now() + hours * 3600000),
  past: (hours = 1) => new Date(Date.now() - hours * 3600000),
  isoString: () => new Date('2024-01-01T12:00:00Z').toISOString(),
}

// Form data factories
export const createMockFormData = {
  login: (overrides: Partial<AuthRequest> = {}) => createMockAuthRequest(overrides),
  register: (overrides: Partial<RegisterRequest> = {}) => createMockRegisterRequest(overrides),
}

// Test helper to create multiple items
export const createMockList = <T>(factory: () => T, count: number): T[] => 
  Array.from({ length: count }, factory)

// Auth context state factory
export const createMockAuthContextValue = (overrides: any = {}) => ({
  isAuthenticated: false,
  userEmail: null,
  isLoading: false,
  loginWithJWT: vi.fn(),
  registerUser: vi.fn(),
  auth: null,
  login: vi.fn(),
  logout: vi.fn(),
  getJwt: vi.fn(() => null),
  ...overrides,
})