import { describe, it, expect } from 'vitest'
import { defaultPaymentYear, seasonLabel } from '../defaultPaymentYear'

describe('seasonLabel', () => {
  it('names the season that ends in the given payment year', () => {
    expect(seasonLabel(2027)).toBe('2026-27')
  })
})

describe('defaultPaymentYear', () => {
  it('proposes the current year until 30 September', () => {
    expect(defaultPaymentYear(new Date(2026, 8, 30, 23, 59, 59))).toBe(2026)
  })

  it('proposes the next year from 1 October', () => {
    expect(defaultPaymentYear(new Date(2026, 9, 1, 0, 0, 0))).toBe(2027)
  })

  it('proposes the next year on 31 December', () => {
    expect(defaultPaymentYear(new Date(2026, 11, 31))).toBe(2027)
  })
})
