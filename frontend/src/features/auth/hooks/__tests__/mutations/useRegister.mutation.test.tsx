import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { useRegisterMutation } from '../../mutations/useRegister.mutation'
// Mock the auth service at the top
vi.mock('@/features/auth/data/auth.service')

import { 
  createMockRegisterRequest, 
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

describe('useRegisterMutation', () => {
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
      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      expect(result.current).toEqual({
        registerMutation: expect.any(Function),
        isPending: expect.any(Boolean),
        error: null
      })
    })

    it('should initialize with correct default states', () => {
      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      expect(result.current.registerMutation).toBeInstanceOf(Function)
      expect(result.current.isPending).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should use different property names than login mutation (isPending vs isLoading)', () => {
      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      // Note: This hook uses isPending instead of isLoading (inconsistent with other mutations)
      expect(result.current).toHaveProperty('isPending')
      expect(result.current).not.toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('registerMutation')
      expect(result.current).not.toHaveProperty('register')
    })
  })

  describe('Successful Registration', () => {
    it('should successfully call register service with correct parameters', async () => {
      const mockCredentials = createMockRegisterRequest({
        email: 'newuser@example.com',
        password: 'newpassword123'
      })
      const mockResponse = createMockAuthResponse()
      
      mockAuthService.register.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(mockCredentials)

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith(mockCredentials)
      })
    })

    it('should handle successful registration response correctly', async () => {
      const mockCredentials = createMockRegisterRequest()
      const mockResponse = createMockAuthResponse({
        access_token: 'new.user.token',
        token_type: 'bearer'
      })
      
      mockAuthService.register.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(mockCredentials)

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
        expect(result.current.error).toBe(null)
      })

      expect(mockAuthService.register).toHaveBeenCalledWith(mockCredentials)
    })

    it('should set pending state correctly during mutation', async () => {
      const mockCredentials = createMockRegisterRequest()
      const mockResponse = createMockAuthResponse()
      
      // Mock with delay to test pending state
      mockAuthService.register.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      )

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(mockCredentials)

      // Check pending state is true immediately after calling register
      await waitFor(() => {
        expect(result.current.isPending).toBe(true)
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      }, { timeout: 200 })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors correctly', async () => {
      const mockCredentials = createMockRegisterRequest()
      const networkError = createMockAxiosError('Network Error', 0)
      
      mockAuthService.register.mockRejectedValue(networkError)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isPending).toBe(false)
      })

      expect(mockAuthService.register).toHaveBeenCalledWith(mockCredentials)
    })

    it('should handle 400 bad request errors (validation errors)', async () => {
      const mockCredentials = createMockRegisterRequest()
      const validationError = createMockAxiosError('Validation Error', 400, {
        message: 'Email already exists'
      })
      
      mockAuthService.register.mockRejectedValue(validationError)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(validationError)
        expect(result.current.isPending).toBe(false)
      })
    })

    it('should handle 409 conflict errors (user already exists)', async () => {
      const mockCredentials = createMockRegisterRequest()
      const conflictError = createMockAxiosError('Conflict', 409, {
        message: 'User with this email already exists'
      })
      
      mockAuthService.register.mockRejectedValue(conflictError)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(conflictError)
        expect(result.current.isPending).toBe(false)
      })
    })

    it('should handle 422 unprocessable entity errors', async () => {
      const mockCredentials = createMockRegisterRequest()
      const validationError = createMockAxiosError('Unprocessable Entity', 422, {
        message: 'Password too weak',
        details: {
          password: ['Password must be at least 8 characters long']
        }
      })
      
      mockAuthService.register.mockRejectedValue(validationError)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(validationError)
        expect(result.current.isPending).toBe(false)
      })
    })

    it('should handle 500 server errors', async () => {
      const mockCredentials = createMockRegisterRequest()
      const serverError = createMockAxiosError('Internal Server Error', 500)
      
      mockAuthService.register.mockRejectedValue(serverError)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(serverError)
        expect(result.current.isPending).toBe(false)
      })
    })

    it('should handle timeout errors', async () => {
      const mockCredentials = createMockRegisterRequest()
      const timeoutError = createMockAxiosError('timeout of 10000ms exceeded', 0)
      timeoutError.code = 'ECONNABORTED'
      
      mockAuthService.register.mockRejectedValue(timeoutError)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(mockCredentials)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(timeoutError)
        expect(result.current.isPending).toBe(false)
      })
    })
  })

  describe('API Integration', () => {
    it('should call authService.register with exact parameters', async () => {
      const specificCredentials = createMockRegisterRequest({
        email: 'specific-register@test.com',
        password: 'specificRegisterPass123'
      })
      
      mockAuthService.register.mockResolvedValue(createMockAuthResponse())

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(specificCredentials)

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith({
          email: 'specific-register@test.com',
          username: 'testuser',
          password: 'specificRegisterPass123'
        })
        expect(mockAuthService.register).toHaveBeenCalledTimes(1)
      })
    })

    it('should not modify the request data', async () => {
      const originalCredentials = createMockRegisterRequest({
        email: 'register@example.com',
        password: 'registerPassword'
      })
      const credentialsCopy = { ...originalCredentials }
      
      mockAuthService.register.mockResolvedValue(createMockAuthResponse())

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(originalCredentials)

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalled()
      })

      // Verify original object wasn't modified
      expect(originalCredentials).toEqual(credentialsCopy)
    })

    it('should handle different user data formats', async () => {
      const credentialsWithDifferentFormat = {
        email: 'test-format@example.com',
        username: 'test-format',
        password: 'password-with-special-chars!@#$%'
      }
      
      mockAuthService.register.mockResolvedValue(createMockAuthResponse())

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(credentialsWithDifferentFormat)

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith(credentialsWithDifferentFormat)
      })
    })
  })

  describe('Multiple Calls', () => {
    it('should handle multiple sequential registration attempts', async () => {
      const credentials1 = createMockRegisterRequest({ email: 'user1@register.com' })
      const credentials2 = createMockRegisterRequest({ email: 'user2@register.com' })
      
      mockAuthService.register
        .mockResolvedValueOnce(createMockAuthResponse({ access_token: 'token1' }))
        .mockResolvedValueOnce(createMockAuthResponse({ access_token: 'token2' }))

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      // First registration
      result.current.registerMutation(credentials1)
      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Second registration
      result.current.registerMutation(credentials2)
      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      expect(mockAuthService.register).toHaveBeenCalledTimes(2)
      expect(mockAuthService.register).toHaveBeenNthCalledWith(1, credentials1)
      expect(mockAuthService.register).toHaveBeenNthCalledWith(2, credentials2)
    })

    it('should handle rapid successive calls correctly', async () => {
      const mockCredentials = createMockRegisterRequest()
      
      mockAuthService.register.mockResolvedValue(createMockAuthResponse())

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      // Make multiple rapid calls
      result.current.registerMutation(mockCredentials)
      result.current.registerMutation(mockCredentials)
      result.current.registerMutation(mockCredentials)

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Should have made multiple calls
      expect(mockAuthService.register).toHaveBeenCalledTimes(3)
    })
  })

  describe('State Transitions', () => {
    it('should handle mutation lifecycle correctly', async () => {
      const mockCredentials = createMockRegisterRequest()
      const mockResponse = createMockAuthResponse()
      
      mockAuthService.register.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      // Initial state
      expect(result.current.isPending).toBe(false)
      expect(result.current.error).toBe(null)

      result.current.registerMutation(mockCredentials)

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Final state should be success (no error)
      expect(result.current.error).toBe(null)
      expect(mockAuthService.register).toHaveBeenCalledWith(mockCredentials)
    })

    it('should handle error states correctly', async () => {
      const mockCredentials = createMockRegisterRequest()
      const mockError = createMockAxiosError('Registration failed', 400)
      
      mockAuthService.register.mockRejectedValue(mockError)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      // Initial state
      expect(result.current.isPending).toBe(false)
      expect(result.current.error).toBe(null)

      result.current.registerMutation(mockCredentials)

      // Wait for error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Final state should show error
      expect(result.current.isPending).toBe(false)
      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('Hook Interface Consistency', () => {
    it('should document inconsistent naming with other mutation hooks', () => {
      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      // This hook uses different naming conventions:
      // - registerMutation instead of register
      // - isPending instead of isLoading
      // This inconsistency should be noted for future refactoring
      
      expect(result.current).toHaveProperty('registerMutation')
      expect(result.current).toHaveProperty('isPending')
      expect(result.current).toHaveProperty('error')
      
      // These properties do NOT exist (unlike other mutation hooks)
      expect(result.current).not.toHaveProperty('register')
      expect(result.current).not.toHaveProperty('isLoading')
    })

    it('should work with React Query mutation patterns despite naming inconsistency', async () => {
      const mockCredentials = createMockRegisterRequest()
      mockAuthService.register.mockResolvedValue(createMockAuthResponse())

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      // Despite naming differences, should still function correctly
      expect(result.current.isPending).toBe(false)
      
      result.current.registerMutation(mockCredentials)
      
      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
        expect(result.current.error).toBe(null)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined credentials gracefully', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Credentials required'))

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(undefined as any)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(mockAuthService.register).toHaveBeenCalledWith(undefined)
    })

    it('should handle null credentials gracefully', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Credentials required'))

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(null as any)

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(mockAuthService.register).toHaveBeenCalledWith(null)
    })

    it('should handle service method not available', async () => {
      mockAuthService.register.mockImplementation(() => {
        throw new Error('Register service unavailable')
      })

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(createMockRegisterRequest())

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error!.message).toBe('Register service unavailable')
      })
    })

    it('should handle malformed response gracefully', async () => {
      const mockCredentials = createMockRegisterRequest()
      // Mock response without required fields
      const malformedResponse = { some: 'other data' } as any
      
      mockAuthService.register.mockResolvedValue(malformedResponse)

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(mockCredentials)

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
        expect(result.current.error).toBe(null)
      })

      // Should still complete successfully even with unexpected response format
      expect(mockAuthService.register).toHaveBeenCalledWith(mockCredentials)
    })

    it('should handle very long passwords and emails', async () => {
      const longEmail = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com'
      const longPassword = 'c'.repeat(200)
      
      const credentialsWithLongStrings = createMockRegisterRequest({
        email: longEmail,
        password: longPassword
      })
      
      mockAuthService.register.mockResolvedValue(createMockAuthResponse())

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper
      })

      result.current.registerMutation(credentialsWithLongStrings)

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith(credentialsWithLongStrings)
      })
    })
  })
})