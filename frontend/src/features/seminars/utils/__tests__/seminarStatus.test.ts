import { describe, expect, it } from 'vitest'
import { displayStatus } from '../seminarStatus'
import type { Seminar } from '../../data/schemas/seminar.schema'

const seminar = (status: Seminar['status'], start: string): Seminar =>
  ({ status, start_date: start, end_date: start }) as Seminar

describe('displayStatus', () => {
  const now = new Date('2026-10-26T12:00:00')

  it('shows a past seminar still stored as upcoming as finished', () => {
    expect(displayStatus(seminar('upcoming', '2026-10-17T10:00:00'), now)).toBe('completed')
  })

  it('keeps upcoming for a seminar later today or in the future', () => {
    expect(displayStatus(seminar('upcoming', '2026-10-26T18:00:00'), now)).toBe('upcoming')
    expect(displayStatus(seminar('upcoming', '2026-11-16T10:00:00'), now)).toBe('upcoming')
  })

  it('keeps cancelled as cancelled', () => {
    expect(displayStatus(seminar('cancelled', '2026-10-17T10:00:00'), now)).toBe('cancelled')
  })
})
