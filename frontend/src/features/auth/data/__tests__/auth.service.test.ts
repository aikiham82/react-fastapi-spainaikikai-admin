import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authService } from '../auth.service'
import { apiClient } from '@/core/data/apiClient'
import {
  createMockAuthRequest,
  createMockRegisterRequest,
  createMockAuthResponse,
  createMockAuthUser,
  createMockCurrentUser,
  createMockAxiosError,
  mockApiCall,
} from '@/test-utils'

// Mock the apiClient module
vi.mock('@/core/data/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockApiClient = apiClient as any

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    const mockUserData = createMockAuthRequest()
    const mockAuthResponse = createMockAuthResponse()

    it('should successfully login with valid credentials', async () => {
      // Arrange
      mockApiClient.post.mockResolvedValue(mockAuthResponse)

      // Act
      const result = await authService.login(mockUserData)

      // Assert
      expect(result).toEqual(mockAuthResponse)
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.any(URLSearchParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      // Verify form data formatting
      const [, formData] = mockApiClient.post.mock.calls[0]
      expect(formData.get('username')).toBe(mockUserData.email)
      expect(formData.get('password')).toBe(mockUserData.password)
    })

    it('should format login data as form-encoded URLSearchParams', async () => {
      // Arrange
      mockApiClient.post.mockResolvedValue(mockAuthResponse)
      const userData = createMockAuthRequest({
        email: 'user@test.com',
        password: 'secret123',
      })

      // Act
      await authService.login(userData)

      // Assert
      const [url, formData, config] = mockApiClient.post.mock.calls[0]
      
      expect(url).toBe('/api/v1/auth/login')
      expect(formData).toBeInstanceOf(URLSearchParams)
      expect(formData.get('username')).toBe('user@test.com')
      expect(formData.get('password')).toBe('secret123')
      expect(config.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    })

    it('should handle invalid credentials error', async () => {
      // Arrange
      const mockError = createMockAxiosError('Invalid credentials', 401, {
        error: 'unauthorized',
      })
      mockApiClient.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.login(mockUserData)).rejects.toThrow()
      expect(mockApiClient.post).toHaveBeenCalledTimes(1)
    })

    it('should handle validation errors', async () => {
      // Arrange
      const mockError = createMockAxiosError('Validation failed', 400, {
        error: 'validation_error',
        details: ['Email is required', 'Password must be at least 8 characters'],
      })
      mockApiClient.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.login(mockUserData)).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network Error')
      mockApiClient.post.mockRejectedValue(networkError)

      // Act & Assert
      await expect(authService.login(mockUserData)).rejects.toThrow('Network Error')
    })

    it('should handle server errors', async () => {
      // Arrange
      const mockError = createMockAxiosError('Internal Server Error', 500)
      mockApiClient.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.login(mockUserData)).rejects.toThrow()
    })

    it('should handle empty credentials', async () => {
      // Arrange
      const emptyUserData = createMockAuthRequest({ email: '', password: '' })
      mockApiClient.post.mockResolvedValue(mockAuthResponse)

      // Act
      await authService.login(emptyUserData)

      // Assert
      const [, formData] = mockApiClient.post.mock.calls[0]
      expect(formData.get('username')).toBe('')
      expect(formData.get('password')).toBe('')
    })

    it('should handle special characters in credentials', async () => {
      // Arrange
      const specialUserData = createMockAuthRequest({
        email: 'test+user@example.com',
        password: 'p@$$w0rd!@#',
      })
      mockApiClient.post.mockResolvedValue(mockAuthResponse)

      // Act
      await authService.login(specialUserData)

      // Assert
      const [, formData] = mockApiClient.post.mock.calls[0]
      expect(formData.get('username')).toBe('test+user@example.com')
      expect(formData.get('password')).toBe('p@$$w0rd!@#')
    })
  })

  describe('register', () => {
    const mockUserData = createMockRegisterRequest()
    const mockAuthResponse = createMockAuthResponse()

    it('should successfully register with valid data', async () => {
      // Arrange
      mockApiClient.post.mockResolvedValue(mockAuthResponse)

      // Act
      const result = await authService.register(mockUserData)

      // Assert
      expect(result).toEqual(mockAuthResponse)
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/register',
        mockUserData
      )
    })

    it('should send JSON data for registration (not form-encoded)', async () => {
      // Arrange
      mockApiClient.post.mockResolvedValue(mockAuthResponse)

      // Act
      await authService.register(mockUserData)

      // Assert
      const [url, data] = mockApiClient.post.mock.calls[0]
      expect(url).toBe('/api/v1/auth/register')
      expect(data).toEqual(mockUserData)
      expect(data).not.toBeInstanceOf(URLSearchParams)
    })

    it('should handle user already exists error', async () => {
      // Arrange
      const mockError = createMockAxiosError('User already exists', 409, {
        error: 'user_exists',
      })
      mockApiClient.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.register(mockUserData)).rejects.toThrow()
    })

    it('should handle validation errors', async () => {
      // Arrange
      const mockError = createMockAxiosError('Validation failed', 400, {
        error: 'validation_error',
        details: ['Invalid email format'],
      })
      mockApiClient.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.register(mockUserData)).rejects.toThrow()
    })

    it('should handle network errors during registration', async () => {
      // Arrange
      const networkError = new Error('Network Error')
      mockApiClient.post.mockRejectedValue(networkError)

      // Act & Assert
      await expect(authService.register(mockUserData)).rejects.toThrow('Network Error')
    })

    it('should handle email validation errors', async () => {
      // Arrange
      const invalidEmailData = createMockRegisterRequest({ email: 'invalid-email' })
      const mockError = createMockAxiosError('Invalid email format', 400)
      mockApiClient.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.register(invalidEmailData)).rejects.toThrow()
    })

    it('should handle weak password errors', async () => {
      // Arrange
      const weakPasswordData = createMockRegisterRequest({ password: '123' })
      const mockError = createMockAxiosError('Password too weak', 400)
      mockApiClient.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.register(weakPasswordData)).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('should successfully logout', async () => {
      // Arrange
      const mockResponse = 'Logged out successfully'
      mockApiClient.post.mockResolvedValue(mockResponse)

      // Act
      const result = await authService.logout()

      // Assert
      expect(result).toBe(mockResponse)
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/logout')
    })

    it('should handle logout errors', async () => {
      // Arrange
      const mockError = createMockAxiosError('Logout failed', 500)
      mockApiClient.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.logout()).rejects.toThrow()
    })

    it('should handle unauthorized logout attempts', async () => {
      // Arrange
      const mockError = createMockAxiosError('Unauthorized', 401)
      mockApiClient.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.logout()).rejects.toThrow()
    })

    it('should handle network errors during logout', async () => {
      // Arrange
      const networkError = new Error('Network Error')
      mockApiClient.post.mockRejectedValue(networkError)

      // Act & Assert
      await expect(authService.logout()).rejects.toThrow('Network Error')
    })

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'TimeoutError'
      mockApiClient.post.mockRejectedValue(timeoutError)

      // Act & Assert
      await expect(authService.logout()).rejects.toThrow('Timeout')
    })
  })

  describe('updateUser', () => {
    const mockUserData = createMockAuthUser()
    const mockUpdatedUser = createMockAuthUser({ email: 'updated@example.com' })

    it('should successfully update user data', async () => {
      // Arrange
      mockApiClient.put.mockResolvedValue(mockUpdatedUser)

      // Act
      const result = await authService.updateUser(mockUserData)

      // Assert
      expect(result).toEqual(mockUpdatedUser)
      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/auth/users', mockUserData)
    })

    it('should handle validation errors during update', async () => {
      // Arrange
      const mockError = createMockAxiosError('Invalid email format', 400)
      mockApiClient.put.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.updateUser(mockUserData)).rejects.toThrow()
    })

    it('should handle unauthorized update attempts', async () => {
      // Arrange
      const mockError = createMockAxiosError('Unauthorized', 401)
      mockApiClient.put.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.updateUser(mockUserData)).rejects.toThrow()
    })

    it('should handle user not found errors', async () => {
      // Arrange
      const mockError = createMockAxiosError('User not found', 404)
      mockApiClient.put.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.updateUser(mockUserData)).rejects.toThrow()
    })

    it('should handle server errors during update', async () => {
      // Arrange
      const mockError = createMockAxiosError('Internal Server Error', 500)
      mockApiClient.put.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.updateUser(mockUserData)).rejects.toThrow()
    })

    it('should update user with partial data', async () => {
      // Arrange
      const partialUserData = createMockAuthUser({ email: undefined })
      mockApiClient.put.mockResolvedValue(mockUpdatedUser)

      // Act
      const result = await authService.updateUser(partialUserData)

      // Assert
      expect(result).toEqual(mockUpdatedUser)
      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/auth/users', partialUserData)
    })
  })

  describe('getCurrentUser', () => {
    const mockCurrentUser = createMockCurrentUser()

    it('should successfully get current user', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue(mockCurrentUser)

      // Act
      const result = await authService.getCurrentUser()

      // Assert
      expect(result).toEqual(mockCurrentUser)
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/users/me')
    })

    it('should handle unauthorized access', async () => {
      // Arrange
      const mockError = createMockAxiosError('Unauthorized', 401)
      mockApiClient.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow()
    })

    it('should handle user not found', async () => {
      // Arrange
      const mockError = createMockAxiosError('User not found', 404)
      mockApiClient.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow()
    })

    it('should handle server errors', async () => {
      // Arrange
      const mockError = createMockAxiosError('Internal Server Error', 500)
      mockApiClient.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network Error')
      mockApiClient.get.mockRejectedValue(networkError)

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow('Network Error')
    })

    it('should handle malformed response data', async () => {
      // Arrange
      const malformedResponse = { incomplete: 'data' }
      mockApiClient.get.mockResolvedValue(malformedResponse)

      // Act
      const result = await authService.getCurrentUser()

      // Assert
      expect(result).toEqual(malformedResponse)
    })

    it('should handle inactive user', async () => {
      // Arrange
      const inactiveUser = createMockCurrentUser({ is_active: false })
      mockApiClient.get.mockResolvedValue(inactiveUser)

      // Act
      const result = await authService.getCurrentUser()

      // Assert
      expect(result).toEqual(inactiveUser)
      expect(result.is_active).toBe(false)
    })
  })

  describe('API Integration Edge Cases', () => {
    it('should handle null responses', async () => {
      // Arrange
      mockApiClient.post.mockResolvedValue(null)

      // Act & Assert
      const result = await authService.logout()
      expect(result).toBeNull()
    })

    it('should handle undefined responses', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue(undefined)

      // Act
      const result = await authService.getCurrentUser()

      // Assert
      expect(result).toBeUndefined()
    })

    it('should handle empty string responses', async () => {
      // Arrange
      mockApiClient.post.mockResolvedValue('')

      // Act
      const result = await authService.logout()

      // Assert
      expect(result).toBe('')
    })

    it('should handle concurrent API calls', async () => {
      // Arrange
      const mockResponse1 = createMockAuthResponse({ access_token: 'token1' })
      const mockResponse2 = createMockAuthResponse({ access_token: 'token2' })
      mockApiClient.post
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      // Act
      const [result1, result2] = await Promise.all([
        authService.login(createMockAuthRequest({ email: 'user1@test.com' })),
        authService.login(createMockAuthRequest({ email: 'user2@test.com' })),
      ])

      // Assert
      expect(result1.access_token).toBe('token1')
      expect(result2.access_token).toBe('token2')
      expect(mockApiClient.post).toHaveBeenCalledTimes(2)
    })

    it('should handle very long response delays', async () => {
      // Arrange
      const mockResponse = createMockCurrentUser()
      mockApiClient.get.mockImplementation(() => mockApiCall.success(mockResponse, 100))

      // Act
      const startTime = Date.now()
      const result = await authService.getCurrentUser()
      const endTime = Date.now()

      // Assert
      expect(result).toEqual(mockResponse)
      expect(endTime - startTime).toBeGreaterThan(50)
    })

    it('should handle HTTP status code edge cases', async () => {
      // Test various HTTP status codes
      const statusCodes = [
        { code: 403, message: 'Forbidden' },
        { code: 422, message: 'Unprocessable Entity' },
        { code: 429, message: 'Too Many Requests' },
        { code: 502, message: 'Bad Gateway' },
        { code: 503, message: 'Service Unavailable' },
      ]

      for (const { code, message } of statusCodes) {
        // Arrange
        const mockError = createMockAxiosError(message, code)
        mockApiClient.post.mockRejectedValueOnce(mockError)

        // Act & Assert
        await expect(authService.login(createMockAuthRequest())).rejects.toThrow()
      }
    })

    it('should handle malformed JSON responses', async () => {
      // Arrange - This would typically be handled by axios/apiClient
      const mockResponse = { invalid: 'json', missing: 'required_fields' }
      mockApiClient.get.mockResolvedValue(mockResponse)

      // Act
      const result = await authService.getCurrentUser()

      // Assert
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Data Transformation', () => {
    it('should preserve email case sensitivity in login', async () => {
      // Arrange
      const userData = createMockAuthRequest({ email: 'Test.User@Example.COM' })
      mockApiClient.post.mockResolvedValue(createMockAuthResponse())

      // Act
      await authService.login(userData)

      // Assert
      const [, formData] = mockApiClient.post.mock.calls[0]
      expect(formData.get('username')).toBe('Test.User@Example.COM')
    })

    it('should handle Unicode characters in credentials', async () => {
      // Arrange
      const unicodeData = createMockAuthRequest({
        email: 'üser@tëst.com',
        password: 'pássw🔑rd',
      })
      mockApiClient.post.mockResolvedValue(createMockAuthResponse())

      // Act
      await authService.login(unicodeData)

      // Assert
      const [, formData] = mockApiClient.post.mock.calls[0]
      expect(formData.get('username')).toBe('üser@tëst.com')
      expect(formData.get('password')).toBe('pássw🔑rd')
    })

    it('should handle very long strings in user data', async () => {
      // Arrange
      const longEmail = 'a'.repeat(100) + '@example.com'
      const longPassword = 'p'.repeat(200)
      const userData = createMockRegisterRequest({
        email: longEmail,
        password: longPassword,
      })
      mockApiClient.post.mockResolvedValue(createMockAuthResponse())

      // Act
      await authService.register(userData)

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/register', {
        email: longEmail,
        username: 'testuser',
        password: longPassword,
      })
    })
  })

  describe('Error Response Handling', () => {
    it('should preserve error details from API responses', async () => {
      // Arrange
      const detailedError = createMockAxiosError('Validation failed', 400, {
        error: 'validation_error',
        details: {
          email: ['Invalid email format'],
          password: ['Password too weak'],
        },
        code: 'VALIDATION_ERROR',
      })
      mockApiClient.post.mockRejectedValue(detailedError)

      // Act & Assert
      await expect(authService.register(createMockRegisterRequest())).rejects.toThrow()
    })

    it('should handle errors without response data', async () => {
      // Arrange
      const error = new Error('Network connection failed')
      mockApiClient.get.mockRejectedValue(error)

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow('Network connection failed')
    })

    it('should handle errors with null response', async () => {
      // Arrange
      const error = createMockAxiosError('Server Error', 500, null)
      mockApiClient.post.mockRejectedValue(error)

      // Act & Assert
      await expect(authService.logout()).rejects.toThrow()
    })
  })

  describe('Service Method Contracts', () => {
    it('should have correct method signatures', () => {
      // Verify the service exports all expected methods
      expect(typeof authService.login).toBe('function')
      expect(typeof authService.register).toBe('function')
      expect(typeof authService.logout).toBe('function')
      expect(typeof authService.updateUser).toBe('function')
      expect(typeof authService.getCurrentUser).toBe('function')
    })

    it('should maintain async method contracts', async () => {
      // All methods should return promises
      mockApiClient.post.mockResolvedValue(createMockAuthResponse())
      mockApiClient.get.mockResolvedValue(createMockCurrentUser())
      mockApiClient.put.mockResolvedValue(createMockAuthUser())

      const loginResult = authService.login(createMockAuthRequest())
      const registerResult = authService.register(createMockRegisterRequest())
      const logoutResult = authService.logout()
      const updateResult = authService.updateUser(createMockAuthUser())
      const getCurrentResult = authService.getCurrentUser()

      expect(loginResult).toBeInstanceOf(Promise)
      expect(registerResult).toBeInstanceOf(Promise)
      expect(logoutResult).toBeInstanceOf(Promise)
      expect(updateResult).toBeInstanceOf(Promise)
      expect(getCurrentResult).toBeInstanceOf(Promise)

      // Wait for all to complete
      await Promise.all([loginResult, registerResult, logoutResult, updateResult, getCurrentResult])
    })
  })
})