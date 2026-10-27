import { describe, expect, it } from 'vitest'
import { fromDateTimeLocalInput, parseUtcDateTime, toDateTimeLocalInput } from '../format'

const utc = (iso: string) => new Date(`${iso}Z`).getTime()

describe('parseUtcDateTime', () => {
  it.each([
    ['winter seminar', '2026-10-31T09:00:00'],
    ['summer seminar', '2026-07-11T06:00:00'],
    ['local midnight in Spain', '2026-05-22T22:00:00'],
    ['with microseconds', '2026-10-31T09:00:00.123456'],
  ])('reads a naive API datetime as UTC (%s)', (_, value) => {
    expect(parseUtcDateTime(value)?.getTime()).toBe(utc(value.slice(0, 23)))
  })

  it('keeps an explicit offset', () => {
    expect(parseUtcDateTime('2026-10-31T09:00:00Z')?.getTime()).toBe(utc('2026-10-31T09:00:00'))
    expect(parseUtcDateTime('2026-10-31T10:00:00+01:00')?.getTime()).toBe(utc('2026-10-31T09:00:00'))
  })

  it('keeps a date-only string on its calendar day', () => {
    const date = parseUtcDateTime('2026-10-31')
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([2026, 9, 31])
  })

  it('returns null for empty or invalid values', () => {
    expect(parseUtcDateTime(null)).toBeNull()
    expect(parseUtcDateTime('')).toBeNull()
    expect(parseUtcDateTime('nope')).toBeNull()
  })
})

describe('toDateTimeLocalInput', () => {
  it.each([
    ['winter', '2026-10-31T09:00:00'],
    ['summer', '2026-07-11T06:00:00'],
    ['local midnight', '2026-05-22T22:00:00'],
    ['DST change start', '2026-10-24T08:00:00'],
    ['DST change end', '2026-10-26T09:00:00'],
  ])('sends back the same instant when a %s value is saved unchanged', (_, stored) => {
    const inputValue = toDateTimeLocalInput(stored)

    expect(inputValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(new Date(inputValue).toISOString()).toBe(new Date(`${stored}Z`).toISOString())
  })

  it('returns an empty value for missing dates', () => {
    expect(toDateTimeLocalInput(undefined)).toBe('')
  })

  it('shows a winter 09:00Z seminar at 10:00 in Madrid, where the tests run', () => {
    expect(toDateTimeLocalInput('2026-10-31T09:00:00')).toBe('2026-10-31T10:00')
  })
})

describe('fromDateTimeLocalInput', () => {
  it('turns a Madrid wall time into its UTC instant', () => {
    expect(fromDateTimeLocalInput('2026-07-11T08:00')).toBe('2026-07-11T06:00:00.000Z')
  })

  it('returns an empty value for an invalid input instead of throwing', () => {
    expect(fromDateTimeLocalInput('')).toBe('')
    expect(fromDateTimeLocalInput('nope')).toBe('')
  })
})

describe('parseUtcDateTime with microseconds and an offset', () => {
  it('trims the fraction before parsing', () => {
    expect(parseUtcDateTime('2026-10-31T09:00:00.123456+00:00')?.getTime()).toBe(utc('2026-10-31T09:00:00.123'))
  })
})
