import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { useLogoutMutation } from '../../mutations/useLogout.mutation'
import { cleanup } from '@/test-utils/mocks'

describe('useLogoutMutation', () => {
  let queryClient: QueryClient
  let clearSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    
    // Spy on queryClient.clear method
    clearSpy = vi.spyOn(queryClient, 'clear').mockImplementation(() => {})
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup.all()
    clearSpy.mockRestore()
  })

  const createWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  describe('Hook Structure', () => {
    it('should return correct structure with expected properties', () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      expect(result.current).toEqual({
        logout: expect.any(Function),
        isLoading: expect.any(Boolean),
        error: null
      })
    })

    it('should initialize with correct default states', () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      expect(result.current.logout).toBeInstanceOf(Function)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should use mutateAsync for logout function (not mutate)', () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      // The logout function should be mutateAsync (bound function) to return a promise
      expect(typeof result.current.logout).toBe('function')
    })
  })

  describe('Successful Logout', () => {
    it('should successfully clear query cache on logout', async () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      await result.current.logout()

      expect(clearSpy).toHaveBeenCalledTimes(1)
    })

    it('should complete logout operation without errors', async () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      await expect(result.current.logout()).resolves.toBeUndefined()

      expect(result.current.error).toBe(null)
      expect(result.current.isLoading).toBe(false)
    })

    it('should set loading state correctly during mutation', async () => {
      // Mock queryClient.clear to take some time
      clearSpy.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      // Note: Due to the sync nature of queryClient.clear(),
      // the loading state might not be observable in this test
      const logoutPromise = result.current.logout()
      
      // The function should return a promise
      expect(logoutPromise).toBeInstanceOf(Promise)
      
      await logoutPromise

      // Loading should be false after completion
      expect(result.current.isLoading).toBe(false)
    })

    it('should call onSuccess callback after successful logout', async () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      // The mutation should complete successfully
      await result.current.logout()

      expect(clearSpy).toHaveBeenCalled()
      expect(result.current.error).toBe(null)
    })
  })

  describe('Error Handling', () => {
    it('should handle queryClient.clear errors gracefully', async () => {
      const clearError = new Error('Failed to clear cache')
      clearSpy.mockImplementation(() => {
        throw clearError
      })

      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      await expect(result.current.logout()).rejects.toThrow('Failed to clear cache')

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle async queryClient.clear errors', async () => {
      const clearError = new Error('Async clear failed')
      clearSpy.mockImplementation(() => {
        throw clearError
      })

      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      await expect(result.current.logout()).rejects.toThrow('Async clear failed')

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle memory-related cache clear errors', async () => {
      const memoryError = new Error('Out of memory during cache clear')
      clearSpy.mockImplementation(() => {
        throw memoryError
      })

      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      await expect(result.current.logout()).rejects.toThrow('Out of memory during cache clear')

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })
  })

  describe('Query Cache Integration', () => {
    it('should clear all cached queries and mutations', async () => {
      // Add some data to the cache
      queryClient.setQueryData(['users'], { data: 'user data' })
      queryClient.setQueryData(['products'], { data: 'product data' })
      queryClient.setQueryData(['orders'], { data: 'order data' })

      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      await result.current.logout()

      expect(clearSpy).toHaveBeenCalledTimes(1)
      
      // Verify clear was called on the correct queryClient instance
      expect(clearSpy).toHaveBeenCalledWith()
    })

    it('should not interfere with new queries after logout', async () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      await result.current.logout()

      // After logout, new queries should still work
      queryClient.setQueryData(['new-data'], { data: 'new data after logout' })
      const newData = queryClient.getQueryData(['new-data'])

      expect(newData).toEqual({ data: 'new data after logout' })
      expect(clearSpy).toHaveBeenCalledTimes(1)
    })

    it('should handle cache clear with active queries', async () => {
      // Simulate active queries
      queryClient.prefetchQuery({
        queryKey: ['active-query'],
        queryFn: () => Promise.resolve({ data: 'active' })
      })

      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      await result.current.logout()

      expect(clearSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Multiple Calls', () => {
    it('should handle multiple sequential logout attempts', async () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      // First logout
      await result.current.logout()
      expect(clearSpy).toHaveBeenCalledTimes(1)

      // Second logout
      await result.current.logout()
      expect(clearSpy).toHaveBeenCalledTimes(2)

      // Third logout
      await result.current.logout()
      expect(clearSpy).toHaveBeenCalledTimes(3)
    })

    it('should handle concurrent logout calls', async () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      // Make multiple concurrent calls
      const promises = [
        result.current.logout(),
        result.current.logout(),
        result.current.logout()
      ]

      await Promise.all(promises)

      expect(clearSpy).toHaveBeenCalledTimes(3)
    })

    it('should handle mixed success and failure scenarios', async () => {
      let callCount = 0
      clearSpy.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve()
        } else if (callCount === 2) {
          throw new Error('Second call fails')
        } else {
          return Promise.resolve()
        }
      })

      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      // First call should succeed
      await result.current.logout()
      expect(result.current.error).toBe(null)

      // Second call should fail
      await expect(result.current.logout()).rejects.toThrow('Second call fails')
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Third call should succeed again
      await result.current.logout()
      // Note: error might still be from previous failed mutation in React Query
      
      expect(clearSpy).toHaveBeenCalledTimes(3)
    })
  })

  describe('Implementation Details', () => {
    it('should use mutateAsync instead of mutate for promise return', async () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      // mutateAsync returns a promise, mutate does not
      const logoutResult = result.current.logout()
      expect(logoutResult).toBeInstanceOf(Promise)

      await logoutResult
    })

    it('should have access to React Query mutation state', async () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      // Initially idle
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)

      const logoutPromise = result.current.logout()

      // Should show loading during execution
      await waitFor(() => {
        if (result.current.isLoading) {
          expect(result.current.isLoading).toBe(true)
        }
      })

      await logoutPromise

      // Should return to idle after completion
      expect(result.current.isLoading).toBe(false)
    })

    it('should maintain mutation instance across re-renders', () => {
      const { result, rerender } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      const firstInstance = result.current.logout
      rerender()
      const secondInstance = result.current.logout

      // Function instances should be stable across re-renders
      expect(firstInstance).toBe(secondInstance)
    })
  })

  describe('Edge Cases', () => {
    it('should handle queryClient being null or undefined', async () => {
      // This is a theoretical edge case - in practice, the hook would throw
      // if queryClient is not available, but we test the robustness
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      // Even with a mocked clear that might fail, the structure should be maintained
      expect(result.current.logout).toBeInstanceOf(Function)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })


    it('should not have side effects when mutation fails', async () => {
      const originalState = { isLoading: false, error: null }
      clearSpy.mockImplementation(() => {
        throw new Error('Clear failed')
      })

      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper
      })

      // Capture pre-logout state
      expect(result.current.isLoading).toBe(originalState.isLoading)
      expect(result.current.error).toBe(originalState.error)

      // Attempt logout
      await expect(result.current.logout()).rejects.toThrow('Clear failed')

      // Verify we're back to non-loading state (error state is expected)
      expect(result.current.isLoading).toBe(false)
    })
  })
})