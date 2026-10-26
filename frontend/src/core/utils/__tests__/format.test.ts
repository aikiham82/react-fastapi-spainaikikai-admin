import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatDateTime, formatDayMonth } from '../format'

describe('formatDate', () => {
  it('formats es-ES dates as dd/mm/yyyy', () => {
    expect(formatDate('2025-03-01')).toBe('01/03/2025')
  })

  it('returns a dash for null values', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate(undefined)).toBe('-')
    expect(formatDate('')).toBe('-')
  })

  it('keeps the calendar day of a date-only string in any timezone', () => {
    expect(formatDate('2025-01-01')).toBe('01/01/2025')
  })

  it('returns a dash for unparseable dates', () => {
    expect(formatDate('not a date')).toBe('-')
  })
})

describe('formatDayMonth', () => {
  it('formats as dd/mm without the year', () => {
    expect(formatDayMonth('2025-03-01')).toBe('01/03')
    expect(formatDayMonth('2025-12-25T10:00:00')).toBe('25/12')
  })

  it('returns a dash for empty or invalid dates', () => {
    expect(formatDayMonth(null)).toBe('-')
    expect(formatDayMonth('nope')).toBe('-')
  })
})

describe('formatDateTime', () => {
  it('formats date and 24h time', () => {
    expect(formatDateTime('2025-11-16T10:30:00')).toBe('16/11/2025, 10:30')
  })

  it('returns a dash for null values', () => {
    expect(formatDateTime(null)).toBe('-')
  })
})

describe('formatCurrency', () => {
  it('formats euros with thousands separator and trailing symbol', () => {
    expect(formatCurrency(1234.5)).toBe('1.234,50 €')
  })

  it('formats small amounts with two decimals', () => {
    expect(formatCurrency(50)).toBe('50,00 €')
  })

  it('returns a dash for null values', () => {
    expect(formatCurrency(null)).toBe('-')
    expect(formatCurrency(undefined)).toBe('-')
  })
})
