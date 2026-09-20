import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { useLoginMutation } from '../../mutations/useLogin.mutation'
// Mock the auth service at the top
vi.mock('@/features/auth/data/auth.service')

import { 
  createMockAuthRequest, 
  createMockAuthResponse 
} from '@/test-utils/factories'
import { 
  mockAuthService, 
  createMockAxiosError,
  cleanup 
} from '@/test-utils/mocks'

// Import after mocking
import { authService } from '@/features/auth/data/auth.service'
Object.assign(authService, mockAuthService)

describe('useLoginMutation', () => {
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
    cleanup.all()
  })

  const createWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  describe('Hook Structure', () => {
    it('should return correct structure with expected properties', () => {
      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      expect(result.current).toEqual({
        login: expect.any(Function),
        isLoading: expect.any(Boolean),
        error: null
      })
    })

    it('should initialize with correct default states', () => {
      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      expect(result.current.login).toBeInstanceOf(Function)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  describe('Successful Login', () => {
    it('should successfully call login service with correct parameters', async () => {
      const mockCredentials = createMockAuthRequest({
        email: 'test@example.com',
        password: 'password123'
      })
      const mockResponse = createMockAuthResponse()
      
      mockAuthService.login.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(mockCredentials)

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith(mockCredentials)
      })
    })

    it('should handle successful login response correctly', async () => {
      const mockCredentials = createMockAuthRequest()
      const mockResponse = createMockAuthResponse({
        access_token: 'valid.jwt.token',
        token_type: 'bearer'
      })
      
      mockAuthService.login.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(mockCredentials)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBe(null)
      })

      expect(mockAuthService.login).toHaveBeenCalledWith(mockCredentials)
    })

    it('should set loading state correctly during mutation', async () => {
      const mockCredentials = createMockAuthRequest()
      const mockResponse = createMockAuthResponse()
      
      // Mock with delay to test loading state
      mockAuthService.login.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      )

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(mockCredentials)

      // Check loading state is true immediately after calling login
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 200 })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors correctly', async () => {
      const mockCredentials = createMockAuthRequest()
      const networkError = createMockAxiosError('Network Error', 0)
      
      mockAuthService.login.mockRejectedValue(networkError)

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockAuthService.login).toHaveBeenCalledWith(mockCredentials)
    })

    it('should handle 401 unauthorized errors', async () => {
      const mockCredentials = createMockAuthRequest()
      const unauthorizedError = createMockAxiosError('Invalid credentials', 401, {
        message: 'Invalid email or password'
      })
      
      mockAuthService.login.mockRejectedValue(unauthorizedError)

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(unauthorizedError)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle 400 bad request errors', async () => {
      const mockCredentials = createMockAuthRequest()
      const badRequestError = createMockAxiosError('Bad Request', 400, {
        message: 'Email is required'
      })
      
      mockAuthService.login.mockRejectedValue(badRequestError)

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(badRequestError)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle 500 server errors', async () => {
      const mockCredentials = createMockAuthRequest()
      const serverError = createMockAxiosError('Internal Server Error', 500)
      
      mockAuthService.login.mockRejectedValue(serverError)

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(serverError)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle timeout errors', async () => {
      const mockCredentials = createMockAuthRequest()
      const timeoutError = createMockAxiosError('timeout of 5000ms exceeded', 0)
      timeoutError.code = 'ECONNABORTED'
      
      mockAuthService.login.mockRejectedValue(timeoutError)

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(timeoutError)
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('API Integration', () => {
    it('should call authService.login with exact parameters', async () => {
      const specificCredentials = createMockAuthRequest({
        email: 'specific@test.com',
        password: 'specificPassword123'
      })
      
      mockAuthService.login.mockResolvedValue(createMockAuthResponse())

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(specificCredentials)

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith({
          email: 'specific@test.com',
          password: 'specificPassword123'
        })
        expect(mockAuthService.login).toHaveBeenCalledTimes(1)
      })
    })

    it('should not modify the request data', async () => {
      const originalCredentials = createMockAuthRequest({
        email: 'test@example.com',
        password: 'password'
      })
      const credentialsCopy = { ...originalCredentials }
      
      mockAuthService.login.mockResolvedValue(createMockAuthResponse())

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(originalCredentials)

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalled()
      })

      // Verify original object wasn't modified
      expect(originalCredentials).toEqual(credentialsCopy)
    })
  })

  describe('Multiple Calls', () => {
    it('should handle multiple sequential login attempts', async () => {
      const credentials1 = createMockAuthRequest({ email: 'user1@test.com' })
      const credentials2 = createMockAuthRequest({ email: 'user2@test.com' })
      
      mockAuthService.login
        .mockResolvedValueOnce(createMockAuthResponse({ access_token: 'token1' }))
        .mockResolvedValueOnce(createMockAuthResponse({ access_token: 'token2' }))

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      // First login
      result.current.login(credentials1)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Second login
      result.current.login(credentials2)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockAuthService.login).toHaveBeenCalledTimes(2)
      expect(mockAuthService.login).toHaveBeenNthCalledWith(1, credentials1)
      expect(mockAuthService.login).toHaveBeenNthCalledWith(2, credentials2)
    })

    it('should handle rapid successive calls correctly', async () => {
      const mockCredentials = createMockAuthRequest()
      
      mockAuthService.login.mockResolvedValue(createMockAuthResponse())

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      // Make multiple rapid calls
      result.current.login(mockCredentials)
      result.current.login(mockCredentials)
      result.current.login(mockCredentials)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should have made multiple calls
      expect(mockAuthService.login).toHaveBeenCalledTimes(3)
    })
  })

  describe('State Transitions', () => {
    it('should handle mutation lifecycle correctly', async () => {
      const mockCredentials = createMockAuthRequest()
      const mockResponse = createMockAuthResponse()
      
      mockAuthService.login.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      // Initial state
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)

      result.current.login(mockCredentials)

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Final state should be success (no error)
      expect(result.current.error).toBe(null)
      expect(mockAuthService.login).toHaveBeenCalledWith(mockCredentials)
    })

    it('should handle error states correctly', async () => {
      const mockCredentials = createMockAuthRequest()
      const mockError = createMockAxiosError('Login failed', 401)
      
      mockAuthService.login.mockRejectedValue(mockError)

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      // Initial state
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)

      result.current.login(mockCredentials)

      // Wait for error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Final state should show error
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined credentials gracefully', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Credentials required'))

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(undefined as any)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(mockAuthService.login).toHaveBeenCalledWith(undefined)
    })

    it('should handle null credentials gracefully', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Credentials required'))

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(null as any)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(mockAuthService.login).toHaveBeenCalledWith(null)
    })

    it('should handle service method not available', async () => {
      mockAuthService.login.mockImplementation(() => {
        throw new Error('Login service unavailable')
      })

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper
      })

      result.current.login(createMockAuthRequest())

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error!.message).toBe('Login service unavailable')
      })
    })
  })
})