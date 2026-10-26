import { describe, expect, it } from 'vitest'
import { normalizeCountry } from '../country'

describe('normalizeCountry', () => {
  it('shows Spain in Spanish', () => {
    expect(normalizeCountry('Spain')).toBe('España')
    expect(normalizeCountry(' spain ')).toBe('España')
  })

  it('defaults empty values to España and keeps other countries', () => {
    expect(normalizeCountry('')).toBe('España')
    expect(normalizeCountry(null)).toBe('España')
    expect(normalizeCountry('Portugal')).toBe('Portugal')
  })
})
