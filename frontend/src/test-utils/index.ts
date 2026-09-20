// Export all testing utilities for easy importing in test files

// Re-export React Testing Library with custom render functions
export * from './render'

// Export mock factories
export * from './factories'

// Export mock utilities and helpers
export * from './mocks'

// Both './render' (React Testing Library) and './mocks' export `cleanup`.
// The barrel exposes RTL's; the mock helper object is `mockCleanup`.
export { cleanup } from './render'
export { cleanup as mockCleanup } from './mocks'

// Export commonly used testing utilities from vitest
export { 
  describe, 
  it, 
  expect, 
  vi, 
  beforeEach, 
  afterEach, 
  beforeAll, 
  afterAll,
  test,
} from 'vitest'

// Export user-event for interaction testing
export { default as userEvent } from '@testing-library/user-event'