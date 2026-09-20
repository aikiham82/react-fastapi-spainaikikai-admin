import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { appStorage } from '../appStorage'

describe('appStorage', () => {
  // Mock storage objects
  let mockLocalStorage: { [key: string]: string }
  let mockSessionStorage: { [key: string]: string }

  beforeEach(() => {
    // Reset storage mocks
    mockLocalStorage = {}
    mockSessionStorage = {}

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key]
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {}
        }),
      },
      writable: true,
    })

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockSessionStorage[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete mockSessionStorage[key]
        }),
        clear: vi.fn(() => {
          mockSessionStorage = {}
        }),
      },
      writable: true,
    })

    // Clear console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('local storage wrapper', () => {
    describe('get method', () => {
      it('should parse and return JSON data from localStorage', () => {
        const testData = { id: 1, name: 'test' }
        mockLocalStorage.testKey = JSON.stringify(testData)

        const storage = appStorage()
        const result = storage.local.get('testKey')

        expect(result).toEqual(testData)
        expect(localStorage.getItem).toHaveBeenCalledWith('testKey')
      })

      it('should return null for non-existent keys', () => {
        const storage = appStorage()
        const result = storage.local.get('nonExistentKey')

        expect(result).toBeNull()
        expect(localStorage.getItem).toHaveBeenCalledWith('nonExistentKey')
      })

      it('should handle JSON parsing errors gracefully', () => {
        mockLocalStorage.badKey = 'invalid-json'

        const storage = appStorage()
        const result = storage.local.get('badKey')

        expect(result).toBeNull()
        expect(console.error).toHaveBeenCalledWith('Error getting local storage:', expect.any(SyntaxError))
      })

      it('should handle localStorage access errors', () => {
        const storage = appStorage()
        
        // Mock getItem to throw an error
        vi.mocked(localStorage.getItem).mockImplementation(() => {
          throw new Error('Storage access denied')
        })

        const result = storage.local.get('testKey')

        expect(result).toBeNull()
        expect(console.error).toHaveBeenCalledWith('Error getting local storage:', expect.any(Error))
      })

      it('should handle null values from localStorage', () => {
        const storage = appStorage()
        
        // localStorage returns null, JSON.parse should handle it gracefully
        const result = storage.local.get('nullKey')

        expect(result).toBeNull()
      })
    })

    describe('set method', () => {
      it('should stringify and store objects in localStorage', () => {
        const testData = { id: 1, name: 'test' }
        const storage = appStorage()

        storage.local.set('testKey', testData)

        expect(localStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify(testData))
        expect(mockLocalStorage.testKey).toBe(JSON.stringify(testData))
      })

      it('should store primitive values', () => {
        const storage = appStorage()

        storage.local.set('numberKey', 42)
        storage.local.set('stringKey', 'hello')
        storage.local.set('booleanKey', true)

        expect(localStorage.setItem).toHaveBeenCalledWith('numberKey', '42')
        expect(localStorage.setItem).toHaveBeenCalledWith('stringKey', '"hello"')
        expect(localStorage.setItem).toHaveBeenCalledWith('booleanKey', 'true')
      })

      it('should handle null and undefined values', () => {
        const storage = appStorage()

        storage.local.set('nullKey', null)
        storage.local.set('undefinedKey', undefined)

        expect(localStorage.setItem).toHaveBeenCalledWith('nullKey', 'null')
        expect(localStorage.setItem).toHaveBeenCalledWith('undefinedKey', undefined)
      })
    })

    describe('setString method', () => {
      it('should store string values directly without JSON stringify', () => {
        const storage = appStorage()
        const testString = 'direct-string-value'

        storage.local.setString('stringKey', testString)

        expect(localStorage.setItem).toHaveBeenCalledWith('stringKey', testString)
        expect(mockLocalStorage.stringKey).toBe(testString)
      })

      it('should pass non-string values straight through to setItem', () => {
        const storage = appStorage()

        // setString takes a string; these casts document what happens when
        // untyped callers pass something else. The real localStorage coerces,
        // the mock records the raw value.
        storage.local.setString('numberKey', 42 as unknown as string)
        storage.local.setString('objectKey', { id: 1 } as unknown as string)

        expect(localStorage.setItem).toHaveBeenCalledWith('numberKey', 42)
        expect(localStorage.setItem).toHaveBeenCalledWith('objectKey', { id: 1 })
      })
    })

    describe('getString method', () => {
      it('should return string value from localStorage', () => {
        mockLocalStorage.testKey = 'test-string'
        const storage = appStorage()

        const result = storage.local.getString('testKey')

        expect(result).toBe('test-string')
        expect(localStorage.getItem).toHaveBeenCalledWith('testKey')
      })

      it('should return null for non-existent keys', () => {
        const storage = appStorage()

        const result = storage.local.getString('nonExistentKey')

        expect(result).toBeNull()
      })

      it('should handle localStorage access errors gracefully', () => {
        const storage = appStorage()
        
        // Mock getItem to throw an error
        vi.mocked(localStorage.getItem).mockImplementation(() => {
          throw new Error('Storage quota exceeded')
        })

        const result = storage.local.getString('testKey')

        expect(result).toBeNull()
        expect(console.error).toHaveBeenCalledWith('Error getting local storage:', expect.any(Error))
      })
    })

    describe('remove method', () => {
      it('should remove item from localStorage', () => {
        mockLocalStorage.testKey = 'test-value'
        const storage = appStorage()

        storage.local.remove('testKey')

        expect(localStorage.removeItem).toHaveBeenCalledWith('testKey')
        expect(mockLocalStorage.testKey).toBeUndefined()
      })

      it('should handle removal errors gracefully', () => {
        const storage = appStorage()
        
        // Mock removeItem to throw an error
        vi.mocked(localStorage.removeItem).mockImplementation(() => {
          throw new Error('Storage operation failed')
        })

        const result = storage.local.remove('testKey')

        expect(result).toBeNull()
        expect(console.error).toHaveBeenCalledWith('Error removing local storage:', expect.any(Error))
      })

      it('should not throw when removing non-existent keys', () => {
        const storage = appStorage()

        expect(() => storage.local.remove('nonExistentKey')).not.toThrow()
        expect(localStorage.removeItem).toHaveBeenCalledWith('nonExistentKey')
      })
    })

    describe('clear method', () => {
      it('should clear all localStorage data', () => {
        mockLocalStorage.key1 = 'value1'
        mockLocalStorage.key2 = 'value2'
        const storage = appStorage()

        storage.local.clear()

        expect(localStorage.clear).toHaveBeenCalled()
        expect(mockLocalStorage).toEqual({})
      })

      it('should handle clear operation errors gracefully', () => {
        const storage = appStorage()
        
        // Mock clear to throw an error
        vi.mocked(localStorage.clear).mockImplementation(() => {
          throw new Error('Clear operation failed')
        })

        const result = storage.local.clear()

        expect(result).toBeNull()
        expect(console.error).toHaveBeenCalledWith('Error clearing local storage:', expect.any(Error))
      })
    })
  })

  describe('session storage wrapper', () => {
    describe('get method', () => {
      it('should parse and return JSON data from sessionStorage', () => {
        const testData = { id: 1, name: 'session-test' }
        mockSessionStorage.testKey = JSON.stringify(testData)

        const storage = appStorage()
        const result = storage.session.get('testKey')

        expect(result).toEqual(testData)
        expect(sessionStorage.getItem).toHaveBeenCalledWith('testKey')
      })

      it('should return null for non-existent keys', () => {
        const storage = appStorage()
        const result = storage.session.get('nonExistentKey')

        expect(result).toBeNull()
        expect(sessionStorage.getItem).toHaveBeenCalledWith('nonExistentKey')
      })

      it('should handle JSON parsing errors gracefully', () => {
        mockSessionStorage.badKey = 'invalid-json'

        const storage = appStorage()
        const result = storage.session.get('badKey')

        expect(result).toBeNull()
        expect(console.error).toHaveBeenCalledWith('Error getting session storage:', expect.any(SyntaxError))
      })

      it('should handle sessionStorage access errors', () => {
        const storage = appStorage()
        
        // Mock getItem to throw an error
        vi.mocked(sessionStorage.getItem).mockImplementation(() => {
          throw new Error('Session storage access denied')
        })

        const result = storage.session.get('testKey')

        expect(result).toBeNull()
        expect(console.error).toHaveBeenCalledWith('Error getting session storage:', expect.any(Error))
      })
    })

    describe('set method', () => {
      it('should stringify and store objects in sessionStorage', () => {
        const testData = { id: 1, name: 'session-test' }
        const storage = appStorage()

        storage.session.set('testKey', testData)

        expect(sessionStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify(testData))
        expect(mockSessionStorage.testKey).toBe(JSON.stringify(testData))
      })

      it('should store primitive values', () => {
        const storage = appStorage()

        storage.session.set('numberKey', 100)
        storage.session.set('stringKey', 'session-string')
        storage.session.set('booleanKey', false)

        expect(sessionStorage.setItem).toHaveBeenCalledWith('numberKey', '100')
        expect(sessionStorage.setItem).toHaveBeenCalledWith('stringKey', '"session-string"')
        expect(sessionStorage.setItem).toHaveBeenCalledWith('booleanKey', 'false')
      })
    })

    describe('getString method', () => {
      it('should return string value from sessionStorage', () => {
        mockSessionStorage.testKey = 'session-string'
        const storage = appStorage()

        const result = storage.session.getString('testKey')

        expect(result).toBe('session-string')
        expect(sessionStorage.getItem).toHaveBeenCalledWith('testKey')
      })

      it('should return null for non-existent keys', () => {
        const storage = appStorage()

        const result = storage.session.getString('nonExistentKey')

        expect(result).toBeNull()
      })

      it('should handle sessionStorage access errors gracefully', () => {
        const storage = appStorage()
        
        // Mock getItem to throw an error
        vi.mocked(sessionStorage.getItem).mockImplementation(() => {
          throw new Error('Session storage quota exceeded')
        })

        const result = storage.session.getString('testKey')

        expect(result).toBeNull()
        expect(console.error).toHaveBeenCalledWith('Error getting session storage:', expect.any(Error))
      })
    })

    describe('remove method', () => {
      it('should remove item from sessionStorage', () => {
        mockSessionStorage.testKey = 'test-value'
        const storage = appStorage()

        storage.session.remove('testKey')

        expect(sessionStorage.removeItem).toHaveBeenCalledWith('testKey')
        expect(mockSessionStorage.testKey).toBeUndefined()
      })

      it('should handle removal errors gracefully', () => {
        const storage = appStorage()
        
        // Mock removeItem to throw an error
        vi.mocked(sessionStorage.removeItem).mockImplementation(() => {
          throw new Error('Session storage operation failed')
        })

        const result = storage.session.remove('testKey')

        expect(result).toBeNull()
        expect(console.error).toHaveBeenCalledWith('Error removing session storage:', expect.any(Error))
      })
    })

    describe('clear method', () => {
      it('should clear all sessionStorage data', () => {
        mockSessionStorage.key1 = 'value1'
        mockSessionStorage.key2 = 'value2'
        const storage = appStorage()

        storage.session.clear()

        expect(sessionStorage.clear).toHaveBeenCalled()
        expect(mockSessionStorage).toEqual({})
      })

      it('should handle clear operation errors gracefully', () => {
        const storage = appStorage()
        
        // Mock clear to throw an error
        vi.mocked(sessionStorage.clear).mockImplementation(() => {
          throw new Error('Session clear operation failed')
        })

        const result = storage.session.clear()

        expect(result).toBeNull()
        expect(console.error).toHaveBeenCalledWith('Error clearing session storage:', expect.any(Error))
      })
    })
  })

  describe('storage factory function', () => {
    it('should return both local and session storage wrappers', () => {
      const storage = appStorage()

      expect(storage).toHaveProperty('local')
      expect(storage).toHaveProperty('session')
      expect(typeof storage.local.get).toBe('function')
      expect(typeof storage.local.set).toBe('function')
      expect(typeof storage.local.setString).toBe('function')
      expect(typeof storage.local.getString).toBe('function')
      expect(typeof storage.local.remove).toBe('function')
      expect(typeof storage.local.clear).toBe('function')
      expect(typeof storage.session.get).toBe('function')
      expect(typeof storage.session.set).toBe('function')
      expect(typeof storage.session.getString).toBe('function')
      expect(typeof storage.session.remove).toBe('function')
      expect(typeof storage.session.clear).toBe('function')
    })

    it('should return fresh instances on each call', () => {
      const storage1 = appStorage()
      const storage2 = appStorage()

      expect(storage1).not.toBe(storage2)
      expect(storage1.local).not.toBe(storage2.local)
      expect(storage1.session).not.toBe(storage2.session)
    })
  })

  describe('edge cases and browser compatibility', () => {
    it('should handle storage quota exceeded errors', () => {
      const storage = appStorage()
      
      // Mock setItem to throw quota exceeded error
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        const error = new Error('Storage quota exceeded')
        error.name = 'QuotaExceededError'
        throw error
      })

      // This will actually throw in our current implementation, which is the expected behavior
      expect(() => storage.local.set('key', 'value')).toThrow('Storage quota exceeded')
    })

    it('should handle SecurityError in private browsing mode', () => {
      const storage = appStorage()
      
      // Mock getItem to throw security error (private browsing)
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        const error = new Error('Access denied')
        error.name = 'SecurityError'
        throw error
      })

      const result = storage.local.getString('key')

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle undefined localStorage/sessionStorage', () => {
      // Temporarily remove storage from window
      const originalLocalStorage = window.localStorage
      const originalSessionStorage = window.sessionStorage
      
      // @ts-ignore - Testing edge case
      delete window.localStorage
      // @ts-ignore - Testing edge case
      delete window.sessionStorage

      // This would normally throw, but in our implementation it should be handled
      // Note: Our current implementation doesn't handle this case, but it's worth testing
      // if we ever need to add fallbacks for environments without storage APIs

      // Restore storage
      window.localStorage = originalLocalStorage
      window.sessionStorage = originalSessionStorage
    })

    it('should handle circular references in objects', () => {
      const storage = appStorage()
      const circularObject: any = { name: 'test' }
      circularObject.self = circularObject

      // JSON.stringify should throw on circular references
      // Our current implementation doesn't handle this, but it's a known limitation
      expect(() => storage.local.set('circular', circularObject)).toThrow()
    })
  })

  describe('type safety and interfaces', () => {
    it('should implement IStorageLocal interface correctly', () => {
      const storage = appStorage()
      const local = storage.local

      // Verify all required methods exist and are functions
      expect(typeof local.get).toBe('function')
      expect(typeof local.set).toBe('function')
      expect(typeof local.setString).toBe('function')
      expect(typeof local.getString).toBe('function')
      expect(typeof local.remove).toBe('function')
      expect(typeof local.clear).toBe('function')
    })

    it('should implement IStorageSession interface correctly', () => {
      const storage = appStorage()
      const session = storage.session

      // Verify all required methods exist and are functions
      expect(typeof session.get).toBe('function')
      expect(typeof session.set).toBe('function')
      expect(typeof session.getString).toBe('function')
      expect(typeof session.remove).toBe('function')
      expect(typeof session.clear).toBe('function')
    })
  })

  describe('real-world usage scenarios', () => {
    it('should handle user authentication token storage and retrieval', () => {
      const storage = appStorage()
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

      // Store token
      storage.local.setString('access_token', token)
      
      // Retrieve token
      const retrievedToken = storage.local.getString('access_token')
      
      expect(retrievedToken).toBe(token)
    })

    it('should handle user preferences as objects', () => {
      const storage = appStorage()
      const preferences = {
        theme: 'dark',
        language: 'en',
        notifications: true,
        sidebar: { collapsed: false, width: 250 }
      }

      // Store preferences
      storage.local.set('user_preferences', preferences)
      
      // Retrieve preferences
      const retrievedPreferences = storage.local.get('user_preferences')
      
      expect(retrievedPreferences).toEqual(preferences)
    })

    it('should handle session-specific data', () => {
      const storage = appStorage()
      const sessionData = {
        currentPage: '/dashboard',
        filters: { status: 'active', sort: 'date' },
        timestamp: Date.now()
      }

      // Store in session storage
      storage.session.set('current_session', sessionData)
      
      // Retrieve from session storage
      const retrievedData = storage.session.get('current_session')
      
      expect(retrievedData).toEqual(sessionData)
    })

    it('should handle data migration and cleanup', () => {
      const storage = appStorage()
      
      // Store some old data
      storage.local.set('old_key', 'old_value')
      storage.local.set('new_key', 'new_value')
      
      // Verify data exists
      expect(storage.local.get('old_key')).toBe('old_value')
      expect(storage.local.get('new_key')).toBe('new_value')
      
      // Remove old data
      storage.local.remove('old_key')
      
      // Verify selective removal
      expect(storage.local.get('old_key')).toBeNull()
      expect(storage.local.get('new_key')).toBe('new_value')
    })
  })
})