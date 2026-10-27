import { describe, it, expect } from 'vitest'
import { isSignInAttempt } from '../apiClient'

describe('isSignInAttempt', () => {
  it('treats a refused password login as a sign-in attempt, not an expired session', () => {
    expect(isSignInAttempt('/api/v1/auth/login')).toBe(true)
  })

  it('treats a refused Google login as a sign-in attempt, so its error stays on screen', () => {
    expect(isSignInAttempt('/api/v1/auth/social-login')).toBe(true)
  })

  it('treats any other 401 as an expired session', () => {
    expect(isSignInAttempt('/api/v1/users/me')).toBe(false)
    expect(isSignInAttempt(undefined)).toBe(false)
  })
})
