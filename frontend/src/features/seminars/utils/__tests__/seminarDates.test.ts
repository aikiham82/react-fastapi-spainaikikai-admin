import { describe, it, expect } from 'vitest'
import { canRequestOficialidad, isSeminarPast } from '../seminarDates'
import type { Seminar } from '../../data/schemas/seminar.schema'

const seminar = (overrides: Partial<Seminar>): Seminar =>
  ({
    id: 's-1',
    title: 'Seminario de ejemplo',
    status: 'upcoming',
    is_official: false,
    start_date: new Date(2026, 9, 26, 10, 0).toISOString(),
    end_date: new Date(2026, 9, 26, 10, 0).toISOString(),
    ...overrides,
  }) as Seminar

describe('isSeminarPast', () => {
  it('keeps a one-day seminar upcoming for the rest of the day it starts', () => {
    expect(isSeminarPast(seminar({}), new Date(2026, 9, 26, 15, 0))).toBe(false)
  })

  it('keeps a one-day seminar upcoming until the end of that day', () => {
    expect(isSeminarPast(seminar({}), new Date(2026, 9, 26, 23, 59))).toBe(false)
  })

  it('moves a seminar to past the day after it ends', () => {
    expect(isSeminarPast(seminar({}), new Date(2026, 9, 27, 0, 1))).toBe(true)
  })

  it('keeps a multi-day seminar open until the end of its last day', () => {
    const multi = seminar({ end_date: new Date(2026, 9, 28, 9, 0).toISOString() })
    expect(isSeminarPast(multi, new Date(2026, 9, 28, 20, 0))).toBe(false)
    expect(isSeminarPast(multi, new Date(2026, 9, 29, 0, 1))).toBe(true)
  })

  it('never treats an ongoing seminar as past', () => {
    expect(isSeminarPast(seminar({ status: 'ongoing' }), new Date(2026, 9, 30, 12, 0))).toBe(false)
  })

  it('treats completed and cancelled seminars as past', () => {
    const now = new Date(2026, 9, 1)
    expect(isSeminarPast(seminar({ status: 'completed' }), now)).toBe(true)
    expect(isSeminarPast(seminar({ status: 'cancelled' }), now)).toBe(true)
  })
})

describe('canRequestOficialidad', () => {
  it('stays available on the day of a one-day seminar', () => {
    expect(canRequestOficialidad(seminar({}), new Date(2026, 9, 26, 15, 0))).toBe(true)
  })
})
