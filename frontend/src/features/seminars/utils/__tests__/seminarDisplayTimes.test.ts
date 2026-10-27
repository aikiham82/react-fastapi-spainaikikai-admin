import { describe, expect, it } from 'vitest'
import { dateBlock, startTimeLabel, isSeminarPast } from '../seminarDates'
import type { Seminar } from '../../data/schemas/seminar.schema'

const localTime = (utcIso: string) =>
  new Date(`${utcIso}Z`).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

describe('seminar display times', () => {
  it.each([
    ['winter', '2026-10-31T09:00:00'],
    ['summer', '2026-07-11T06:00:00'],
  ])('shows the local start time of a %s seminar', (_, stored) => {
    expect(startTimeLabel(stored)).toBe(localTime(stored))
  })

  it('shows the local day of a seminar that starts at local midnight', () => {
    const local = new Date('2026-05-22T22:00:00Z')
    expect(dateBlock('2026-05-22T22:00:00').day).toBe(String(local.getDate()))
  })

  it('keeps both ends right across the DST change', () => {
    const seminar = {
      status: 'upcoming',
      start_date: '2026-10-24T08:00:00',
      end_date: '2026-10-26T09:00:00',
    } as Seminar
    const lastLocalDay = new Date('2026-10-26T09:00:00Z')
    const dayAfter = new Date(lastLocalDay.getFullYear(), lastLocalDay.getMonth(), lastLocalDay.getDate() + 1)

    expect(isSeminarPast(seminar, new Date(dayAfter.getTime() - 1))).toBe(false)
    expect(isSeminarPast(seminar, dayAfter)).toBe(true)
  })
})
