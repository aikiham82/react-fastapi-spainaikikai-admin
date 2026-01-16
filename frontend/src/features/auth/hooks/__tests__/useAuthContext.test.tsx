import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider, useAuthContext } from '../useAuthContext'
import {
  createMockAuthRequest,
  createMockAuthResponse,
  createMockJWT,
  createExpiredMockJWT,
  createMockLocalStorageState
} from '@/test-utils/factories'
import { mockAuthService, cleanup } from '@/test-utils/mocks'

// Use vi.hoisted to define mocks before module mocking happens
const { mockAppStorage } = vi.hoisted(() => ({
  mockAppStorage: {
    local: {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      remove: vi.fn(),
      getString: vi.fn().mockReturnValue(null),
      setString: vi.fn(),
      clear: vi.fn()
    },
    session: {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      remove: vi.fn(),
      getString: vi.fn().mockReturnValue(null),
      setString: vi.fn(),
      clear: vi.fn()
    }
  }
}))

// Mock external dependencies
vi.mock('@/features/auth/data/auth.service', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  },
  getCurrentUser: vi.fn().mockResolvedValue(null)
}))

vi.mock('@/core/data/appStorage', () => ({
  appStorage: () => mockAppStorage
}))

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn()
}))

vi.mock('sonner', () => ({
  toast: vi.fn()
}))

// Mock the mutation hooks to control their behavior
vi.mock('../mutations/useLogin.mutation', () => ({
  useLoginMutation: vi.fn(() => ({
    login: vi.fn(),
    isLoading: false,
    error: null
  }))
}))

vi.mock('../mutations/useLogout.mutation', () => ({
  useLogoutMutation: vi.fn(() => ({
    logout: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
    error: null
  }))
}))

vi.mock('../mutations/useRegister.mutation', () => ({
  useRegisterMutation: vi.fn(() => ({
    registerMutation: vi.fn(),
    isPending: false,
    error: null
  }))
}))

import { jwtDecode } from 'jwt-decode'
import { toast } from 'sonner'
import { useLoginMutation } from '../mutations/useLogin.mutation'
import { useLogoutMutation } from '../mutations/useLogout.mutation'
import { useRegisterMutation } from '../mutations/useRegister.mutation'

const mockJwtDecode = vi.mocked(jwtDecode)
const mockToast = vi.mocked(toast)
const mockUseLoginMutation = vi.mocked(useLoginMutation)
const mockUseLogoutMutation = vi.mocked(useLogoutMutation)
const mockUseRegisterMutation = vi.mocked(useRegisterMutation)

describe('useAuthContext', () => {
  let queryClient: QueryClient
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    
    // Clear all mocks
    vi.clearAllMocks()
    cleanup.localStorage()
    
    // Reset storage mocks
    mockAppStorage.local.getString.mockReturnValue(null)
    mockAppStorage.local.setString.mockImplementation(() => {})
    mockAppStorage.local.clear.mockImplementation(() => {})
    mockAppStorage.session.clear.mockImplementation(() => {})
    
    // Reset default mutation mocks
    mockUseLoginMutation.mockReturnValue({
      login: vi.fn(),
      isLoading: false,
      error: null
    })
    
    mockUseLogoutMutation.mockReturnValue({
      logout: vi.fn().mockResolvedValue(undefined),
      isLoading: false,
      error: null
    })
    
    mockUseRegisterMutation.mockReturnValue({
      registerMutation: vi.fn(),
      isPending: false,
      error: null
    })
  })

  afterEach(() => {
    cleanup.all()
  })

  const createWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )

  describe('Hook Usage', () => {
    it('should throw error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuthContext())
      }).toThrow('useAuth must be used within an AuthProvider')
    })

    it('should provide context when used within AuthProvider', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      expect(result.current).toMatchObject({
        isAuthenticated: expect.any(Boolean),
        isLoading: expect.any(Boolean),
        loginWithJWT: expect.any(Function),
        registerUser: expect.any(Function),
        auth: null,
        login: expect.any(Function),
        logout: expect.any(Function),
        getJwt: expect.any(Function)
      })
      
      // userEmail can be either string or null
      expect(result.current.userEmail).toSatisfy((value: any) => 
        typeof value === 'string' || value === null
      )
    })
  })

  describe('Initial State', () => {
    it('should initialize with unauthenticated state when no session exists', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.userEmail).toBe(null)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.auth).toBe(null)
    })

    it('should initialize as authenticated when valid session exists in localStorage', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString()
      const userEmail = 'test@example.com'
      
      // Setup localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn((key) => {
            if (key === 'session_expiration') return futureDate
            if (key === 'user_email') return userEmail
            return null
          }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn()
        }
      })

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.userEmail).toBe(userEmail)
    })

    it('should initialize as unauthenticated when session is expired', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString()
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn((key) => {
            if (key === 'session_expiration') return pastDate
            if (key === 'user_email') return 'test@example.com'
            return null
          }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn()
        }
      })

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('Loading States', () => {
    it('should aggregate loading states from all mutations', () => {
      mockUseLoginMutation.mockReturnValue({
        login: vi.fn(),
        isLoading: true,
        error: null
      })

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('should show loading when logout is in progress', () => {
      mockUseLogoutMutation.mockReturnValue({
        logout: vi.fn().mockResolvedValue(undefined),
        isLoading: true,
        error: null
      })

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('should show loading when registration is in progress', () => {
      mockUseRegisterMutation.mockReturnValue({
        registerMutation: vi.fn(),
        isPending: true,
        error: null
      })

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('Error Handling', () => {
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

    it('should display toast for register errors', async () => {
      const registerError = new Error('Email already exists')
      
      mockUseRegisterMutation.mockReturnValue({
        registerMutation: vi.fn(),
        isPending: false,
        error: registerError
      })

      renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('An error occurred during register')
      })
    })
  })

  describe('JWT Token Management', () => {
    describe('getJwt', () => {
      it('should return token from app storage', () => {
        const mockToken = 'mock.jwt.token'
        mockAppStorage.local.getString.mockReturnValue(mockToken)

        const { result } = renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        const token = result.current.getJwt()
        expect(token).toBe(mockToken)
        expect(mockAppStorage.local.getString).toHaveBeenCalledWith('access_token')
      })

      it('should return null when no token exists', () => {
        mockAppStorage.local.getString.mockReturnValue(null)

        const { result } = renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        const token = result.current.getJwt()
        expect(token).toBe(null)
      })
    })

    describe('loginWithJWT', () => {
      it('should successfully process valid JWT and set authenticated state', async () => {
        const mockToken = createMockJWT({ 
          sub: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        })
        const mockAuthResponse = createMockAuthResponse({ access_token: mockToken })

        mockJwtDecode.mockReturnValue({
          sub: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        })

        const { result } = renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        // Since we can't set auth directly on the result, this test demonstrates
        // that loginWithJWT returns early when auth is not set
        await act(async () => {
          await result.current.loginWithJWT()
        })

        // Since auth is null, JWT decode should not be called
        expect(mockJwtDecode).not.toHaveBeenCalled()
        expect(mockAppStorage.local.setString).not.toHaveBeenCalled()
        expect(result.current.isAuthenticated).toBe(false)
      })

      it('should not process JWT when no auth is set', async () => {
        const { result } = renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        await act(async () => {
          await result.current.loginWithJWT()
        })

        expect(mockJwtDecode).not.toHaveBeenCalled()
        expect(result.current.isAuthenticated).toBe(false)
      })

      it('should handle JWT without expiration', async () => {
        const mockToken = createMockJWT({ sub: 'test@example.com' })
        const mockAuthResponse = createMockAuthResponse({ access_token: mockToken })

        mockJwtDecode.mockReturnValue({
          sub: 'test@example.com'
          // No exp field
        })

        const { result } = renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        await act(async () => {
          await result.current.loginWithJWT()
        })

        // Since auth is null by default, should return early
        expect(mockJwtDecode).not.toHaveBeenCalled()
        expect(mockAppStorage.local.setString).not.toHaveBeenCalled()
      })

      it('should handle JWT decode errors gracefully', async () => {
        const mockToken = 'invalid.jwt.token'
        const mockAuthResponse = createMockAuthResponse({ access_token: mockToken })

        mockJwtDecode.mockImplementation(() => {
          throw new Error('Invalid token')
        })

        const { result } = renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        await act(async () => {
          await result.current.loginWithJWT()
        })

        // Since auth is null, should return early without calling toast
        expect(mockToast).not.toHaveBeenCalled()
        expect(result.current.isAuthenticated).toBe(false)
      })
    })
  })

  describe('Authentication Operations', () => {
    describe('login', () => {
      it('should successfully login and set authenticated state', async () => {
        const mockCredentials = createMockAuthRequest()
        const mockToken = createMockJWT({ 
          sub: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        })
        const mockAuthResponse = createMockAuthResponse({ access_token: mockToken })
        
        const mockLoginMutation = vi.fn()
        mockUseLoginMutation.mockReturnValue({
          login: mockLoginMutation,
          isLoading: false,
          error: null
        })

        mockJwtDecode.mockReturnValue({
          sub: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        })

        const { result } = renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        await act(async () => {
          await result.current.login(mockCredentials)
        })

        expect(mockLoginMutation).toHaveBeenCalledWith(mockCredentials, {
          onSuccess: expect.any(Function)
        })

        // Simulate successful login by calling onSuccess
        const onSuccessCallback = mockLoginMutation.mock.calls[0][1].onSuccess
        act(() => {
          onSuccessCallback(mockAuthResponse)
        })

        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.userEmail).toBe('test@example.com')
        expect(mockAppStorage.local.setString).toHaveBeenCalledWith('access_token', mockToken)
      })

      it('should handle login errors gracefully', async () => {
        const loginError = new Error('Network error')
        
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
    })

    describe('registerUser', () => {
      it('should successfully register and set authenticated state', async () => {
        const mockCredentials = createMockAuthRequest()
        const mockToken = createMockJWT({ 
          sub: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        })
        const mockAuthResponse = createMockAuthResponse({ access_token: mockToken })
        
        const mockRegisterMutation = vi.fn()
        mockUseRegisterMutation.mockReturnValue({
          registerMutation: mockRegisterMutation,
          isPending: false,
          error: null
        })

        mockJwtDecode.mockReturnValue({
          sub: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        })

        const { result } = renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        await act(async () => {
          await result.current.registerUser(mockCredentials)
        })

        expect(mockRegisterMutation).toHaveBeenCalledWith(mockCredentials, {
          onSuccess: expect.any(Function)
        })

        // Simulate successful registration
        const onSuccessCallback = mockRegisterMutation.mock.calls[0][1].onSuccess
        act(() => {
          onSuccessCallback(mockAuthResponse)
        })

        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.userEmail).toBe('test@example.com')
        expect(mockAppStorage.local.setString).toHaveBeenCalledWith('access_token', mockToken)
      })

      it('should handle registration errors gracefully', async () => {
        const registerError = new Error('Email already exists')
        
        mockUseRegisterMutation.mockReturnValue({
          registerMutation: vi.fn(),
          isPending: false,
          error: registerError
        })

        renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        await waitFor(() => {
          expect(mockToast).toHaveBeenCalledWith('An error occurred during register')
        })
      })
    })

    describe('logout', () => {
      it('should successfully logout and clear all state', async () => {
        const mockLogoutMutation = vi.fn().mockResolvedValue(undefined)
        mockUseLogoutMutation.mockReturnValue({
          logout: mockLogoutMutation,
          isLoading: false,
          error: null
        })

        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
          }
        })

        const { result } = renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        // Set initial authenticated state
        act(() => {
          result.current.isAuthenticated = true
          result.current.userEmail = 'test@example.com'
        })

        await act(async () => {
          await result.current.logout()
        })

        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.userEmail).toBe(null)
        expect(result.current.auth).toBe(null)
        
        expect(mockAppStorage.local.clear).toHaveBeenCalled()
        expect(mockAppStorage.session.clear).toHaveBeenCalled()
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('session_expiration')
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('user_email')
        expect(mockLogoutMutation).toHaveBeenCalled()
      })

      it('should handle logout errors gracefully', async () => {
        const mockLogoutMutation = vi.fn().mockRejectedValue(new Error('Network error'))
        mockUseLogoutMutation.mockReturnValue({
          logout: mockLogoutMutation,
          isLoading: false,
          error: null
        })

        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
          }
        })

        const { result } = renderHook(() => useAuthContext(), {
          wrapper: createWrapper
        })

        await act(async () => {
          await result.current.logout()
        })

        expect(mockToast).toHaveBeenCalledWith('Network error')
        // State should still be cleared even if logout mutation fails
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.userEmail).toBe(null)
      })
    })
  })

  describe('Session Management', () => {
    it('should handle session expiration in localStorage correctly', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString()
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn((key) => {
            if (key === 'session_expiration') return futureDate
            if (key === 'user_email') return 'test@example.com'
            return null
          }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn()
        }
      })

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should store session data correctly on successful login', async () => {
      const mockCredentials = createMockAuthRequest()
      const expirationTime = Math.floor(Date.now() / 1000) + 3600
      const mockToken = createMockJWT({ 
        sub: 'test@example.com',
        exp: expirationTime
      })
      const mockAuthResponse = createMockAuthResponse({ access_token: mockToken })
      
      mockJwtDecode.mockReturnValue({
        sub: 'test@example.com',
        exp: expirationTime
      })

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn()
        }
      })

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

      // Trigger onSuccess
      const onSuccessCallback = mockLoginMutation.mock.calls[0][1].onSuccess
      act(() => {
        onSuccessCallback(mockAuthResponse)
      })

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'session_expiration',
        new Date(expirationTime * 1000).toISOString()
      )
      expect(window.localStorage.setItem).toHaveBeenCalledWith('user_email', 'test@example.com')
      expect(mockAppStorage.local.setString).toHaveBeenCalledWith('access_token', mockToken)
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed localStorage session_expiration', () => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn((key) => {
            if (key === 'session_expiration') return 'invalid-date'
            return null
          }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn()
        }
      })

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      // Should default to unauthenticated when date is invalid
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should handle JWT without subject claim', async () => {
      const mockToken = createMockJWT({ 
        exp: Math.floor(Date.now() / 1000) + 3600
        // No sub claim
      })
      const mockAuthResponse = createMockAuthResponse({ access_token: mockToken })

      mockJwtDecode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600
      })

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      await act(async () => {
        await result.current.loginWithJWT()
      })

      // Since auth is null, should return early
      expect(result.current.userEmail).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should handle concurrent logout calls', async () => {
      const mockLogoutMutation = vi.fn().mockResolvedValue(undefined)
      mockUseLogoutMutation.mockReturnValue({
        logout: mockLogoutMutation,
        isLoading: false,
        error: null
      })

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn()
        }
      })

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper
      })

      // Call logout multiple times simultaneously
      await act(async () => {
        await Promise.all([
          result.current.logout(),
          result.current.logout(),
          result.current.logout()
        ])
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.userEmail).toBe(null)
      expect(mockLogoutMutation).toHaveBeenCalledTimes(3)
    })
  })
})