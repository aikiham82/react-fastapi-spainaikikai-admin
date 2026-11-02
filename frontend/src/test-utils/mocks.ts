import { vi } from 'vitest'
import type { AxiosResponse } from 'axios'

// Mock axios responses
export const createMockAxiosResponse = <T = any>(
  data: T,
  status = 200,
  statusText = 'OK'
): AxiosResponse<T> => ({
  data,
  status,
  statusText,
  headers: {},
  config: {} as any,
  request: {},
})

// Mock axios error
export const createMockAxiosError = (
  message = 'Network Error',
  status = 500,
  data?: any
) => {
  const error = new Error(message) as any
  error.response = {
    data: data || { message },
    status,
    statusText: status === 400 ? 'Bad Request' : 'Internal Server Error',
    headers: {},
    config: {},
  }
  error.isAxiosError = true
  return error
}

// Mock API Client
export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
}

// Mock Auth Service
export const mockAuthService = {
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  getCurrentUser: vi.fn(),
}

// Mock App Storage
export const mockAppStorage = {
  local: {
    getString: vi.fn(),
    setString: vi.fn(),
    getObject: vi.fn(),
    setObject: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
  session: {
    getString: vi.fn(),
    setString: vi.fn(),
    getObject: vi.fn(),
    setObject: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}

// Mock React Router hooks
export const mockRouter = {
  navigate: vi.fn(),
  location: {
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  },
  params: {},
}

// Mock window methods
export const mockWindow = {
  alert: vi.fn(),
  confirm: vi.fn(() => true),
  prompt: vi.fn(() => 'test'),
  open: vi.fn(),
  close: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn(),
  reload: vi.fn(),
}

// Note: Use vi.mock() directly in test files for module mocking
// This cannot be wrapped in a helper function due to hoisting requirements

// Helper to mock API calls with different scenarios
export const mockApiCall = {
  success: <T>(data: T, delay = 0) => {
    return new Promise<T>((resolve) => {
      setTimeout(() => resolve(data), delay)
    })
  },
  
  error: (message = 'API Error', status = 500, delay = 0) => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(createMockAxiosError(message, status)), delay)
    })
  },
  
  loading: (delay = 1000) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(null), delay)
    })
  },
}

// Mock timers helper
export const mockTimers = {
  useFakeTimers: () => vi.useFakeTimers(),
  useRealTimers: () => vi.useRealTimers(),
  advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
  runAllTimers: () => vi.runAllTimers(),
  runOnlyPendingTimers: () => vi.runOnlyPendingTimers(),
}

// Mock environment variables
export const mockEnv = (variables: Record<string, string>) => {
  Object.entries(variables).forEach(([key, value]) => {
    process.env[key] = value
  })
}

// Clean up helper
export const cleanup = {
  mocks: () => {
    vi.clearAllMocks()
  },
  
  timers: () => {
    vi.useRealTimers()
  },
  
  localStorage: () => {
    localStorage.clear()
  },
  
  sessionStorage: () => {
    sessionStorage.clear()
  },
  
  all: () => {
    cleanup.mocks()
    cleanup.timers()
    cleanup.localStorage()
    cleanup.sessionStorage()
  },
}

// Test data generators
export const generators = {
  randomString: (length = 10) => 
    Math.random().toString(36).substring(2, length + 2),
  
  randomEmail: () => 
    `${generators.randomString(8)}@${generators.randomString(6)}.com`,
  
  randomNumber: (min = 0, max = 100) => 
    Math.floor(Math.random() * (max - min + 1)) + min,
  
  randomBoolean: () => Math.random() > 0.5,
  
  randomDate: (startDate = new Date(2020, 0, 1), endDate = new Date()) => 
    new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())),
}