import { describe, it, expect } from 'vitest'
import { daysUntil, isExpiringSoon, EXPIRING_SOON_DAYS } from '../expiry'

const now = new Date(2026, 9, 26, 15, 30)

describe('daysUntil', () => {
  it('counts whole calendar days ignoring the time of day', () => {
    expect(daysUntil(new Date(2026, 9, 26, 1).toISOString(), now)).toBe(0)
    expect(daysUntil(new Date(2026, 9, 27, 23).toISOString(), now)).toBe(1)
    expect(daysUntil(new Date(2026, 9, 25, 12).toISOString(), now)).toBe(-1)
  })
})

describe('isExpiringSoon', () => {
  it('is true from today up to the threshold', () => {
    expect(isExpiringSoon(new Date(2026, 9, 26).toISOString(), now)).toBe(true)
    expect(isExpiringSoon(new Date(2026, 9, 26 + EXPIRING_SOON_DAYS).toISOString(), now)).toBe(true)
  })

  it('is false when already expired or too far away', () => {
    expect(isExpiringSoon(new Date(2026, 9, 25).toISOString(), now)).toBe(false)
    expect(isExpiringSoon(new Date(2026, 9, 26 + EXPIRING_SOON_DAYS + 1).toISOString(), now)).toBe(false)
  })
})
