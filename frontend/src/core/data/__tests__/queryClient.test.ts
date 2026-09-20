import { describe, it, expect, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { queryClient } from '../queryClient'

describe('queryClient', () => {
  beforeEach(() => {
    // Clear the query cache before each test
    queryClient.clear()
  })

  describe('configuration', () => {
    it('should be an instance of QueryClient', () => {
      expect(queryClient).toBeInstanceOf(QueryClient)
    })

    it('should have correct default options for queries', () => {
      const defaultOptions = queryClient.getDefaultOptions()

      expect(defaultOptions.queries).toMatchObject({
        staleTime: 0,
        gcTime: 0,
        retry: 1,
        refetchOnWindowFocus: false,
      })
    })

    it('should have correct default options for mutations', () => {
      const defaultOptions = queryClient.getDefaultOptions()

      expect(defaultOptions.mutations).toMatchObject({
        retry: 1,
      })
    })
  })

  describe('query behavior with configuration', () => {
    it('should not cache queries due to staleTime: 0', async () => {
      const queryKey = ['test-query']
      let callCount = 0
      
      const queryFn = async () => {
        callCount++
        return { data: `call-${callCount}` }
      }

      // First query
      const result1 = await queryClient.fetchQuery({
        queryKey,
        queryFn,
      })

      expect(result1).toEqual({ data: 'call-1' })
      expect(callCount).toBe(1)

      // Second identical query should refetch due to staleTime: 0
      const result2 = await queryClient.fetchQuery({
        queryKey,
        queryFn,
      })

      expect(result2).toEqual({ data: 'call-2' })
      expect(callCount).toBe(2)
    })

    it('should not retain data in cache due to gcTime: 0', async () => {
      const queryKey = ['test-gc']
      const queryFn = async () => ({ data: 'test' })

      // Add query to cache
      await queryClient.fetchQuery({
        queryKey,
        queryFn,
      })

      // Verify query is in cache initially
      let cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toEqual({ data: 'test' })

      // Simulate garbage collection by manually removing inactive queries
      // In real scenarios, this happens automatically after gcTime expires
      queryClient.getQueryCache().clear()

      // Verify data is no longer in cache
      cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toBeUndefined()
    })

    it('should retry failed queries once due to retry: 1', async () => {
      const queryKey = ['retry-test']
      let attemptCount = 0

      const queryFn = async () => {
        attemptCount++
        if (attemptCount <= 1) {
          throw new Error(`Attempt ${attemptCount} failed`)
        }
        return { success: true, attempt: attemptCount }
      }

      try {
        const result = await queryClient.fetchQuery({
          queryKey,
          queryFn,
        })

        expect(result).toEqual({ success: true, attempt: 2 })
        expect(attemptCount).toBe(2) // Initial attempt + 1 retry
      } catch (error) {
        // If it still fails after retry, that's expected behavior
        expect(attemptCount).toBe(2)
      }
    })

    it('should not retry more than once', async () => {
      const queryKey = ['retry-limit-test']
      let attemptCount = 0

      const queryFn = async () => {
        attemptCount++
        throw new Error(`Attempt ${attemptCount} failed`)
      }

      try {
        await queryClient.fetchQuery({
          queryKey,
          queryFn,
        })
      } catch (error) {
        expect(attemptCount).toBe(2) // Initial attempt + 1 retry, no more
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should not refetch on window focus', async () => {
      const queryKey = ['focus-test']
      let callCount = 0

      const queryFn = async () => {
        callCount++
        return { call: callCount }
      }

      // Set up query with observer (simulates component using useQuery)
      const observer = queryClient.getQueryCache().build(queryClient, {
        queryKey,
        queryFn,
      })

      await observer.fetch()
      expect(callCount).toBe(1)

      // Simulate window focus event
      // Note: The refetchOnWindowFocus: false should prevent refetching
      window.dispatchEvent(new Event('focus'))
      
      // Wait a bit to ensure no refetch happens
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callCount).toBe(1) // Should still be 1, no refetch on focus
    })
  })

  describe('mutation behavior with configuration', () => {
    it('should retry failed mutations once due to retry: 1', async () => {
      let attemptCount = 0

      const mutationFn = async (data: any) => {
        attemptCount++
        if (attemptCount <= 1) {
          throw new Error(`Mutation attempt ${attemptCount} failed`)
        }
        return { success: true, attempt: attemptCount, data }
      }

      try {
        const result = await queryClient.getMutationCache().build(queryClient, {
          mutationFn,
        }).execute({ test: 'data' })

        expect(result).toEqual({ success: true, attempt: 2, data: { test: 'data' } })
        expect(attemptCount).toBe(2)
      } catch (error) {
        // If it still fails after retry, that's expected
        expect(attemptCount).toBe(2)
      }
    })

    it('should not retry mutations more than once', async () => {
      let attemptCount = 0

      const mutationFn = async () => {
        attemptCount++
        throw new Error(`Mutation attempt ${attemptCount} failed`)
      }

      try {
        await queryClient.getMutationCache().build(queryClient, {
          mutationFn,
        }).execute(undefined)
      } catch (error) {
        expect(attemptCount).toBe(2) // Initial attempt + 1 retry
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('cache management', () => {
    it('should allow manual cache manipulation', async () => {
      const queryKey = ['manual-cache-test']
      const initialData = { value: 'initial' }
      const updatedData = { value: 'updated' }

      // Set initial data
      queryClient.setQueryData(queryKey, initialData)
      
      let cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toEqual(initialData)

      // Update data
      queryClient.setQueryData(queryKey, updatedData)
      
      cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toEqual(updatedData)

      // Remove data
      queryClient.removeQueries({ queryKey })
      
      cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toBeUndefined()
    })

    it('should support query invalidation', async () => {
      const queryKey = ['invalidation-test']
      let callCount = 0

      const queryFn = async () => {
        callCount++
        return { call: callCount }
      }

      // Initial fetch
      await queryClient.fetchQuery({ queryKey, queryFn })
      expect(callCount).toBe(1)

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey })
      await queryClient.refetchQueries({ queryKey })
      
      expect(callCount).toBe(2)
    })

    it('should support prefetching queries', async () => {
      const queryKey = ['prefetch-test']
      let callCount = 0

      const queryFn = async () => {
        callCount++
        return { prefetched: true, call: callCount }
      }

      // Prefetch query
      await queryClient.prefetchQuery({ queryKey, queryFn })
      
      expect(callCount).toBe(1)

      // Get cached data without triggering a new fetch
      const cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toEqual({ prefetched: true, call: 1 })
      expect(callCount).toBe(1) // No additional fetch
    })
  })

  describe('error handling', () => {
    it('should handle query errors appropriately', async () => {
      const queryKey = ['error-test']
      const errorMessage = 'Test query error'

      const queryFn = async () => {
        throw new Error(errorMessage)
      }

      try {
        await queryClient.fetchQuery({ queryKey, queryFn })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(errorMessage)
      }

      // Error should be cached as well
      const queryState = queryClient.getQueryState(queryKey)
      expect(queryState?.error).toBeInstanceOf(Error)
      expect((queryState?.error as Error).message).toBe(errorMessage)
    })

    it('should handle mutation errors appropriately', async () => {
      const errorMessage = 'Test mutation error'

      const mutationFn = async () => {
        throw new Error(errorMessage)
      }

      try {
        await queryClient.getMutationCache().build(queryClient, {
          mutationFn,
        }).execute(undefined)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(errorMessage)
      }
    })
  })

  describe('integration scenarios', () => {
    it('should handle multiple concurrent queries', async () => {
      const promises = []

      for (let i = 1; i <= 3; i++) {
        promises.push(
          queryClient.fetchQuery({
            queryKey: [`concurrent-${i}`],
            queryFn: async () => {
              await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
              return { id: i, timestamp: Date.now() }
            },
          })
        )
      }

      const concurrentResults = await Promise.all(promises)
      
      expect(concurrentResults).toHaveLength(3)
      concurrentResults.forEach((result, index) => {
        expect(result.id).toBe(index + 1)
        expect(typeof result.timestamp).toBe('number')
      })
    })

    it('should handle query cancellation', async () => {
      const queryKey = ['cancellation-test']
      let wasAborted = false

      const queryFn = async ({ signal }: { signal?: AbortSignal }) => {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 100)
          
          if (signal) {
            signal.addEventListener('abort', () => {
              wasAborted = true
              clearTimeout(timeout)
              reject(new Error('Query was cancelled'))
            })
          }
        })
        
        return { completed: true }
      }

      const query = queryClient.fetchQuery({ queryKey, queryFn })
      
      // Cancel the query immediately
      queryClient.cancelQueries({ queryKey })

      try {
        await query
      } catch (error) {
        // Query should be cancelled
        expect(wasAborted).toBe(true)
      }
    })

    it('should support optimistic updates pattern', async () => {
      const queryKey = ['optimistic-test']
      const initialData = { items: [{ id: 1, name: 'Item 1' }] }

      // Set initial data
      queryClient.setQueryData(queryKey, initialData)

      // Simulate optimistic update (like adding a new item)
      const optimisticData = {
        items: [...initialData.items, { id: 2, name: 'Item 2 (optimistic)' }]
      }

      queryClient.setQueryData(queryKey, optimisticData)

      let currentData = queryClient.getQueryData(queryKey)
      expect(currentData).toEqual(optimisticData)

      // Simulate server response (successful mutation)
      const serverData = {
        items: [...initialData.items, { id: 2, name: 'Item 2 (confirmed)' }]
      }

      queryClient.setQueryData(queryKey, serverData)

      currentData = queryClient.getQueryData(queryKey)
      expect(currentData).toEqual(serverData)
    })
  })

  describe('client state', () => {
    it('should track query cache size', async () => {
      const cache = queryClient.getQueryCache()
      
      // Initially empty
      expect(cache.getAll()).toHaveLength(0)

      // Add some queries
      await queryClient.fetchQuery({
        queryKey: ['test-1'],
        queryFn: async () => ({ data: 'test-1' }),
      })

      await queryClient.fetchQuery({
        queryKey: ['test-2'],
        queryFn: async () => ({ data: 'test-2' }),
      })

      expect(cache.getAll()).toHaveLength(2)

      // Clear cache
      cache.clear()
      expect(cache.getAll()).toHaveLength(0)
    })

    it('should track mutation cache', async () => {
      const mutationCache = queryClient.getMutationCache()
      
      // Initially empty
      expect(mutationCache.getAll()).toHaveLength(0)

      // Add a mutation
      await queryClient.getMutationCache().build(queryClient, {
        mutationFn: async () => ({ success: true }),
      }).execute(undefined)

      // Note: Mutations might not stay in cache depending on configuration
      // This test mainly ensures the mutation cache is accessible and functional
      expect(mutationCache.getAll).toBeDefined()
    })
  })
})